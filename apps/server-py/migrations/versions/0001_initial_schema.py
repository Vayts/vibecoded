"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # --- Enums ---
    auth_provider_enum = postgresql.ENUM("email", "google", "apple", name="auth_provider_enum", create_type=False)
    diet_type_enum = postgresql.ENUM(
        "NONE",
        "KETO",
        "VEGAN",
        "VEGETARIAN",
        "PALEO",
        "LOW_CARB",
        "GLUTEN_FREE",
        "DAIRY_FREE",
        name="diet_type_enum",
        create_type=False,
    )
    main_goal_enum = postgresql.ENUM(
        "GENERAL_HEALTH",
        "WEIGHT_LOSS",
        "DIABETES_CONTROL",
        "PREGNANCY",
        "MUSCLE_GAIN",
        name="main_goal_enum",
        create_type=False,
    )
    restriction_enum = postgresql.ENUM(
        "VEGAN",
        "VEGETARIAN",
        "KETO",
        "PALEO",
        "GLUTEN_FREE",
        "DAIRY_FREE",
        "HALAL",
        "KOSHER",
        "NUT_FREE",
        name="restriction_enum",
        create_type=False,
    )
    allergy_enum = postgresql.ENUM(
        "PEANUTS",
        "TREE_NUTS",
        "GLUTEN",
        "DAIRY",
        "SOY",
        "EGGS",
        "SHELLFISH",
        "SESAME",
        "OTHER",
        name="allergy_enum",
        create_type=False,
    )
    nutrition_priority_enum = postgresql.ENUM(
        "HIGH_PROTEIN",
        "LOW_SUGAR",
        "LOW_SODIUM",
        "LOW_CARB",
        "HIGH_FIBER",
        name="nutrition_priority_enum",
        create_type=False,
    )
    scan_source_enum = postgresql.ENUM("barcode", "photo", name="scan_source_enum", create_type=False)
    scan_type_enum = postgresql.ENUM("product", "comparison", name="scan_type_enum", create_type=False)
    personal_analysis_status_enum = postgresql.ENUM(
        "pending", "completed", "failed", name="personal_analysis_status_enum", create_type=False
    )

    for enum in [
        auth_provider_enum,
        diet_type_enum,
        main_goal_enum,
        restriction_enum,
        allergy_enum,
        nutrition_priority_enum,
        scan_source_enum,
        scan_type_enum,
        personal_analysis_status_enum,
    ]:
        enum.create(op.get_bind(), checkfirst=True)

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("image", sa.String(1024), nullable=True),
        sa.Column("subscription_status", sa.String(50), nullable=True),
        sa.Column("subscription_plan", sa.String(50), nullable=True),
        sa.Column("subscription_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revenuecat_app_user_id", sa.String(255), nullable=True),
        sa.Column("free_generations_balance", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("last_monthly_top_up", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("revenuecat_app_user_id", name="uq_users_revenuecat_app_user_id"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # --- user_identities ---
    op.create_table(
        "user_identities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.Enum(name="auth_provider_enum"), nullable=False),
        sa.Column("account_id", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_identities_user_id", "user_identities", ["user_id"])

    # --- user_profiles ---
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("diet_type", sa.Enum(name="diet_type_enum"), nullable=True),
        sa.Column("main_goal", sa.Enum(name="main_goal_enum"), nullable=True),
        sa.Column(
            "restrictions", postgresql.ARRAY(sa.Enum(name="restriction_enum")), nullable=False, server_default="{}"
        ),
        sa.Column("allergies", postgresql.ARRAY(sa.Enum(name="allergy_enum")), nullable=False, server_default="{}"),
        sa.Column("other_allergies_text", sa.Text(), nullable=True),
        sa.Column(
            "nutrition_priorities",
            postgresql.ARRAY(sa.Enum(name="nutrition_priority_enum")),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
    )

    # --- products ---
    op.create_table(
        "products",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("barcode", sa.String(100), nullable=False),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("product_name", sa.String(512), nullable=True),
        sa.Column("brands", sa.String(255), nullable=True),
        sa.Column("image_url", sa.String(1024), nullable=True),
        sa.Column("embedding_text", sa.Text(), nullable=True),
        sa.Column("embedding_vector", sa.Text(), nullable=True),  # replaced after vector ext
        sa.Column("ingredients_text", sa.Text(), nullable=True),
        sa.Column("nutriscore_grade", sa.String(10), nullable=True),
        sa.Column("categories", sa.Text(), nullable=True),
        sa.Column("quantity", sa.String(100), nullable=True),
        sa.Column("serving_size", sa.String(100), nullable=True),
        sa.Column("ingredients", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("allergens", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("additives", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("additives_count", sa.Integer(), nullable=True),
        sa.Column("traces", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("countries", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("category_tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("images", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("nutrition", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("scores", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("barcode", name="uq_products_barcode"),
    )
    op.create_index("ix_products_barcode", "products", ["barcode"])
    # Replace placeholder text column with proper vector column
    op.execute("ALTER TABLE products DROP COLUMN embedding_vector")
    op.execute("ALTER TABLE products ADD COLUMN embedding_vector vector(1536)")

    # --- scans ---
    op.create_table(
        "scans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum(name="scan_type_enum"), nullable=False, server_default="product"),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product2_id", sa.String(36), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("barcode", sa.String(100), nullable=True),
        sa.Column("source", sa.Enum(name="scan_source_enum"), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("overall_rating", sa.String(50), nullable=True),
        sa.Column("personal_analysis_status", sa.Enum(name="personal_analysis_status_enum"), nullable=True),
        sa.Column("personal_analysis_job_id", sa.String(255), nullable=True),
        sa.Column("evaluation", postgresql.JSONB(), nullable=True),
        sa.Column("personal_result", postgresql.JSONB(), nullable=True),
        sa.Column("multi_profile_result", postgresql.JSONB(), nullable=True),
        sa.Column("comparison_result", postgresql.JSONB(), nullable=True),
        sa.Column("photo_image_path", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_scans_user_created", "scans", ["user_id", "created_at"])

    # --- comparisons ---
    op.create_table(
        "comparisons",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product1_id", sa.String(36), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product2_id", sa.String(36), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("barcode1", sa.String(100), nullable=False),
        sa.Column("barcode2", sa.String(100), nullable=False),
        sa.Column("comparison_result", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comparisons_user_created", "comparisons", ["user_id", "created_at"])

    # --- favorites ---
    op.create_table(
        "favorites",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.String(36), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "product_id", name="uq_favorites_user_product"),
    )
    op.create_index("ix_favorites_user_created", "favorites", ["user_id", "created_at"])

    # --- family_members ---
    op.create_table(
        "family_members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("main_goal", sa.Enum(name="main_goal_enum"), nullable=True),
        sa.Column(
            "restrictions", postgresql.ARRAY(sa.Enum(name="restriction_enum")), nullable=False, server_default="{}"
        ),
        sa.Column("allergies", postgresql.ARRAY(sa.Enum(name="allergy_enum")), nullable=False, server_default="{}"),
        sa.Column("other_allergies_text", sa.Text(), nullable=True),
        sa.Column(
            "nutrition_priorities",
            postgresql.ARRAY(sa.Enum(name="nutrition_priority_enum")),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_family_members_user_id", "family_members", ["user_id"])

    # --- product_ingredient_cache ---
    op.create_table(
        "product_ingredient_cache",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("barcode", sa.String(100), nullable=False),
        sa.Column("profile_hash", sa.String(64), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("barcode", "profile_hash", name="uq_ingredient_cache_barcode_profile"),
    )


def downgrade() -> None:
    op.drop_table("product_ingredient_cache")
    op.drop_table("family_members")
    op.drop_table("favorites")
    op.drop_table("comparisons")
    op.drop_table("scans")
    op.drop_table("products")
    op.drop_table("user_profiles")
    op.drop_table("user_identities")
    op.drop_table("users")

    for enum_name in [
        "personal_analysis_status_enum",
        "scan_type_enum",
        "scan_source_enum",
        "nutrition_priority_enum",
        "allergy_enum",
        "restriction_enum",
        "main_goal_enum",
        "diet_type_enum",
        "auth_provider_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")

    op.execute("DROP EXTENSION IF EXISTS vector")
