"""
Schema management script for the Quiz App database.
Uses SQLAlchemy ORM to automatically create/update database tables.

Usage:
    python -m app.schema create    # Create all tables
    python -m app.schema sync      # Add missing columns to existing tables
    python -m app.schema drop      # Drop all tables (WARNING: destructive)
    python -m app.schema reset     # Drop and recreate all tables
    python -m app.schema check     # Check current schema status
"""

import sys
from sqlalchemy import inspect, text
from app.database import Base, engine, SessionLocal
from app.models.user import User, QuizStat
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_existing_tables():
    """Get list of existing tables in the database."""
    inspector = inspect(engine)
    return inspector.get_table_names()


def get_model_tables():
    """Get list of tables defined in ORM models."""
    return [table.name for table in Base.metadata.sorted_tables]


def create_all_tables():
    """Create all tables defined in ORM models."""
    logger.info("Creating database tables...")
    
    existing_tables = get_existing_tables()
    model_tables = get_model_tables()
    
    logger.info(f"Existing tables in database: {existing_tables}")
    logger.info(f"Tables defined in models: {model_tables}")
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✓ All tables created successfully!")
        
        # Verify creation
        new_tables = get_existing_tables()
        created = set(new_tables) - set(existing_tables)
        if created:
            logger.info(f"✓ Newly created tables: {list(created)}")
        else:
            logger.info("ℹ All tables already existed (no changes made)")
            
    except Exception as e:
        logger.error(f"✗ Error creating tables: {e}")
        raise


def drop_all_tables():
    """Drop all tables. WARNING: This will delete all data!"""
    logger.warning("⚠ DROPPING ALL TABLES - This will delete all data!")
    
    existing_tables = get_existing_tables()
    logger.info(f"Tables to be dropped: {existing_tables}")
    
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("✓ All tables dropped successfully!")
    except Exception as e:
        logger.error(f"✗ Error dropping tables: {e}")
        raise


def reset_database():
    """Drop and recreate all tables. WARNING: This will delete all data!"""
    logger.warning("⚠ RESETTING DATABASE - All data will be lost!")
    drop_all_tables()
    create_all_tables()
    logger.info("✓ Database reset complete!")


def check_schema():
    """Check the current database schema status."""
    logger.info("Checking database schema...")
    
    existing_tables = get_existing_tables()
    model_tables = get_model_tables()
    
    logger.info(f"\n{'='*60}")
    logger.info("DATABASE SCHEMA STATUS")
    logger.info(f"{'='*60}")
    
    logger.info(f"\nTables defined in models ({len(model_tables)}):")
    for table in model_tables:
        status = "✓ EXISTS" if table in existing_tables else "✗ MISSING"
        logger.info(f"  - {table}: {status}")
    
    # Check for extra tables not in models
    extra_tables = set(existing_tables) - set(model_tables)
    if extra_tables:
        logger.warning(f"\nExtra tables in database (not in models): {list(extra_tables)}")
    
    # Get detailed schema for each table
    inspector = inspect(engine)
    logger.info(f"\n{'='*60}")
    logger.info("DETAILED TABLE SCHEMAS")
    logger.info(f"{'='*60}")
    
    for table_name in existing_tables:
        logger.info(f"\nTable: {table_name}")
        
        # Get columns
        columns = inspector.get_columns(table_name)
        logger.info("  Columns:")
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f"DEFAULT {col['default']}" if col.get('default') else ""
            logger.info(f"    - {col['name']}: {col['type']} {nullable} {default}")
        
        # Get primary keys
        pk = inspector.get_pk_constraint(table_name)
        if pk and pk['constrained_columns']:
            logger.info(f"  Primary Key: {', '.join(pk['constrained_columns'])}")
        
        # Get foreign keys
        fks = inspector.get_foreign_keys(table_name)
        if fks:
            logger.info("  Foreign Keys:")
            for fk in fks:
                logger.info(f"    - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        # Get indexes
        indexes = inspector.get_indexes(table_name)
        if indexes:
            logger.info("  Indexes:")
            for idx in indexes:
                unique = "UNIQUE" if idx['unique'] else ""
                logger.info(f"    - {idx['name']}: {', '.join(idx['column_names'])} {unique}")
    
    logger.info(f"\n{'='*60}\n")


def sync_schema():
    """Sync schema by adding missing columns to existing tables. Safe operation."""
    logger.info("Syncing database schema...")
    
    inspector = inspect(engine)
    existing_tables = get_existing_tables()
    changes_made = False
    
    # First, create any missing tables
    model_tables = get_model_tables()
    missing_tables = set(model_tables) - set(existing_tables)
    
    if missing_tables:
        logger.info(f"Creating missing tables: {list(missing_tables)}")
        Base.metadata.create_all(bind=engine)
        changes_made = True
    
    # Now sync columns for each existing table
    for table in Base.metadata.sorted_tables:
        table_name = table.name
        
        if table_name not in existing_tables:
            continue
            
        logger.info(f"\nChecking table: {table_name}")
        
        # Get existing columns in database
        existing_columns = {col['name']: col for col in inspector.get_columns(table_name)}
        
        # Get columns defined in model
        model_columns = {col.name: col for col in table.columns}
        
        # Find missing columns
        missing_columns = set(model_columns.keys()) - set(existing_columns.keys())
        
        if missing_columns:
            logger.info(f"  Missing columns detected: {list(missing_columns)}")
            
            for column_name in missing_columns:
                col = model_columns[column_name]
                
                # Skip primary key columns (they should exist from table creation)
                if col.primary_key:
                    logger.warning(f"  ⚠ Skipping primary key column: {column_name}")
                    continue
                
                try:
                    # Build ALTER TABLE statement
                    col_type = col.type.compile(engine.dialect)
                    nullable = "NULL" if col.nullable else "NOT NULL"
                    
                    # Handle default values
                    default_clause = ""
                    if col.default is not None:
                        if hasattr(col.default, 'arg'):
                            # Scalar default value
                            if callable(col.default.arg):
                                # For functions like datetime.now(), we can't easily add them
                                logger.warning(f"  ⚠ Column {column_name} has callable default, setting as NULL")
                                nullable = "NULL"
                            else:
                                default_value = col.default.arg
                                if isinstance(default_value, str):
                                    default_clause = f"DEFAULT '{default_value}'"
                                elif isinstance(default_value, bool):
                                    default_clause = f"DEFAULT {str(default_value).upper()}"
                                else:
                                    default_clause = f"DEFAULT {default_value}"
                    
                    alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {col_type} {nullable} {default_clause}"
                    
                    logger.info(f"  Executing: {alter_stmt}")
                    with engine.connect() as conn:
                        conn.execute(text(alter_stmt))
                        conn.commit()
                    
                    logger.info(f"  ✓ Added column: {column_name}")
                    changes_made = True
                    
                except Exception as e:
                    logger.error(f"  ✗ Error adding column {column_name}: {e}")
                    raise
        else:
            logger.info(f"  ✓ All columns present")
    
    if changes_made:
        logger.info("\n✓ Schema sync completed with changes!")
    else:
        logger.info("\nℹ Schema is already in sync (no changes needed)")


def show_help():
    """Show help message."""
    print(__doc__)


def main():
    """Main entry point for the schema management script."""
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1].lower()
    
    commands = {
        'create': create_all_tables,
        'sync': sync_schema,
        'drop': drop_all_tables,
        'reset': reset_database,
        'check': check_schema,
        'help': show_help,
        '--help': show_help,
        '-h': show_help,
    }
    
    if command in commands:
        commands[command]()
    else:
        logger.error(f"Unknown command: {command}")
        show_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
