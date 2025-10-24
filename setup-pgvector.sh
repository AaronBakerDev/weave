#!/bin/bash
# Script to enable pgvector and run migrations on Render database

echo "🔧 Setting up Weave database on Render..."
echo ""
echo "This script will:"
echo "1. Enable pgvector extension"
echo "2. Run all database migrations"
echo ""

# Get DATABASE_URL from Render
echo "📡 Getting database connection info from Render..."
echo ""
echo "Please visit: https://dashboard.render.com/d/dpg-d3tg40jipnbc7387rbmg-a"
echo "Click 'Connect' → 'External Connection'"
echo "Copy the 'External Database URL'"
echo ""
read -p "Paste the DATABASE_URL here: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ No DATABASE_URL provided. Exiting."
    exit 1
fi

echo ""
echo "✅ DATABASE_URL received"
echo ""

# Enable pgvector
echo "📦 Enabling pgvector extension..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
    echo "❌ Failed to enable pgvector"
    exit 1
}

echo "✅ pgvector enabled"
echo ""

# Verify pgvector
echo "🔍 Verifying pgvector installation..."
psql "$DATABASE_URL" -c "\dx vector" || {
    echo "⚠️  Could not verify pgvector, but continuing..."
}
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
cd "$(dirname "$0")/services/api"

for migration in app/db/migrations/*.sql; do
    echo "  → Running $(basename $migration)..."
    psql "$DATABASE_URL" -f "$migration" || {
        echo "❌ Failed to run $(basename $migration)"
        exit 1
    }
done

echo "  → Running RLS policies..."
psql "$DATABASE_URL" -f app/db/rls.sql || {
    echo "❌ Failed to run RLS policies"
    exit 1
}

echo ""
echo "✅ All migrations completed"
echo ""

# Verify tables
echo "🔍 Verifying database schema..."
psql "$DATABASE_URL" -c "\dt" | head -20

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy web service: Follow DEPLOY.md Step 2"
echo "2. Deploy worker: Follow DEPLOY.md Step 3"
echo "3. Add environment variables: Follow DEPLOY.md Step 5"
