import sys
from pathlib import Path
from sqlalchemy import text, inspect

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.session import engine, Base
import app.models

def run_migration():
    print(f"Running safe database migration on: {engine.url.database}")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # 1. Ensure ai_usage_logs table exists
    if "ai_usage_logs" not in existing_tables:
        print("Creating ai_usage_logs table...")
        app.models.AIUsageLog.__table__.create(bind=engine)
        print("ai_usage_logs table created successfully.")
    else:
        print("ai_usage_logs table already exists.")

    # 2. Check and add missing columns to extracted_facts
    fact_columns = [col["name"] for col in inspector.get_columns("extracted_facts")]
    print(f"Current extracted_facts columns ({len(fact_columns)}): {fact_columns}")

    alter_statements = []
    if "confidence_score" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN confidence_score INTEGER;")
        alter_statements.append("CREATE INDEX IF NOT EXISTS ix_extracted_facts_confidence_score ON extracted_facts (confidence_score);")

    if "confidence_label" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN confidence_label VARCHAR(20);")

    if "confidence_breakdown" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN confidence_breakdown JSONB;")

    if "confidence_reasons" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN confidence_reasons JSONB;")

    if "confidence_version" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN confidence_version VARCHAR(20) DEFAULT 'v1.0';")

    if "model_reported_confidence" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN model_reported_confidence FLOAT;")

    if "date_precision" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN date_precision VARCHAR(20) DEFAULT 'exact';")

    if "char_offset_start" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN char_offset_start INTEGER;")

    if "char_offset_end" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN char_offset_end INTEGER;")

    if "reviewer_notes" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN reviewer_notes TEXT;")

    if "original_extracted_value" not in fact_columns:
        alter_statements.append("ALTER TABLE extracted_facts ADD COLUMN original_extracted_value VARCHAR(255);")

    with engine.begin() as conn:
        for stmt in alter_statements:
            print(f"Executing: {stmt}")
            conn.execute(text(stmt))

    # Verify updated columns
    updated_cols = [col["name"] for col in inspect(engine).get_columns("extracted_facts")]
    print(f"Updated extracted_facts columns ({len(updated_cols)}): {updated_cols}")
    print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
