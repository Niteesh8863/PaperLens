from alembic import op
import sqlalchemy as sa
revision="001_initial"; down_revision=None
def upgrade():
 op.create_table("users",sa.Column("id",sa.Integer,primary_key=True),sa.Column("email",sa.String(255),unique=True),sa.Column("password_hash",sa.String(255),nullable=False),sa.Column("created_at",sa.DateTime))
 op.create_table("documents",sa.Column("id",sa.Integer,primary_key=True),sa.Column("owner_id",sa.Integer,sa.ForeignKey("users.id")),sa.Column("filename",sa.String(255)),sa.Column("storage_path",sa.String(500)),sa.Column("status",sa.String(30)),sa.Column("created_at",sa.DateTime))
 op.create_table("extractions",sa.Column("id",sa.Integer,primary_key=True),sa.Column("document_id",sa.Integer,sa.ForeignKey("documents.id")),sa.Column("kind",sa.String(80)),sa.Column("value",sa.JSON),sa.Column("confidence",sa.Integer),sa.Column("review_status",sa.String(20)),sa.Column("reviewer_note",sa.Text))
def downgrade(): op.drop_table("extractions"); op.drop_table("documents"); op.drop_table("users")
