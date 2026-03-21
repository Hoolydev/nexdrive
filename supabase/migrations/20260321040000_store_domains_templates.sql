-- Add template customization columns to store_settings
ALTER TABLE "public"."store_settings" 
ADD COLUMN IF NOT EXISTS "custom_domain" text,
ADD COLUMN IF NOT EXISTS "hero_template" text DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS "theme_palette" text DEFAULT 'nexdrive-blue',
ADD COLUMN IF NOT EXISTS "font_family" text DEFAULT 'inter';

-- Add unique constraint for custom domain
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'store_settings_custom_domain_key'
    ) THEN
        ALTER TABLE "public"."store_settings" ADD CONSTRAINT "store_settings_custom_domain_key" UNIQUE ("custom_domain");
    END IF;
END $$;

-- Add show_in_store toggle to products
ALTER TABLE "public"."products" 
ADD COLUMN IF NOT EXISTS "show_in_store" boolean DEFAULT true;
