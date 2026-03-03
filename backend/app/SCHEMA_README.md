# Database Schema Management

The `schema.py` script manages database schema via ORM, without manual SQL queries.

## Commands

```bash
# Check database status
docker exec -it upquiz_app python -m app.schema check

# Create missing tables 
docker exec -it upquiz_app python -m app.schema create

# Add missing columns to existing tables (safe)
docker exec -it upquiz_app python -m app.schema sync

# Drop all tables 
docker exec -it upquiz_app python -m app.schema drop

# Full reset 
docker exec -it upquiz_app python -m app.schema reset
```

## What schema.py CAN do:

- ✅ Create new tables (`create`)
- ✅ Add missing columns (`sync`)
- ✅ Check schema status (`check`)
- ✅ Full reset (`reset`)

## What schema.py CANNOT do:

- ❌ Remove old columns
- ❌ Modify existing column types
- ❌ Rename columns/tables
- ❌ Modify constraints/foreign keys

For complex changes, use manual SQL or Alembic migrations.

## Add a New Table

1. Create the model in `app/models/your_model.py`
2. Import the model in `schema.py`
3. Run: `docker exec -it upquiz_app python -m app.schema create`

## Add a Column to Existing Table

1. Add the column to the model in `app/models/`
2. Run: `docker exec -it upquiz_app python -m app.schema sync`

## Notes

- Tables are auto-created on app startup (`main.py`)
- Use `schema.py` for manual management or database reset
- Current models: `User`, `QuizStat`
