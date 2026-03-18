import { useEffect, useState } from "react";
import { Outlet, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, MapPin, Instagram } from "lucide-react";

interface StoreSettings {
  id: string;
  user_id: string;
  store_name: string;
  slug: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  whatsapp_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  description: string | null;
}

export type StoreContextType = { settings: StoreSettings };

export function useStoreContext() {
  return useOutletContext<StoreContextType>();
}

export default function StoreLayout() {
  const { slug } = useParams<{ slug: string }>();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("store_settings")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Loja nao encontrada</h1>
          <p className="text-gray-500">Verifique o endereco e tente novamente.</p>
        </div>
      </div>
    );
  }

  const primaryColor = settings.primary_color || "#1e40af";
  const secondaryColor = settings.secondary_color || "#ffffff";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: primaryColor, color: secondaryColor }} className="shadow-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url && (
              <img src={settings.logo_url} alt={settings.store_name} className="h-12 w-12 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold">{settings.store_name}</h1>
              {settings.description && <p className="text-sm opacity-80">{settings.description}</p>}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-1 opacity-80 hover:opacity-100">
                <Phone className="h-4 w-4" />{settings.phone}
              </a>
            )}
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="flex items-center gap-1 opacity-80 hover:opacity-100">
                <Mail className="h-4 w-4" />{settings.email}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet context={{ settings } satisfies StoreContextType} />
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: primaryColor, color: secondaryColor }} className="mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-2">{settings.store_name}</h3>
              {settings.description && <p className="text-sm opacity-80">{settings.description}</p>}
            </div>
            <div>
              <h3 className="font-bold mb-2">Contato</h3>
              <div className="space-y-1 text-sm opacity-80">
                {settings.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{settings.phone}</p>}
                {settings.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{settings.email}</p>}
                {settings.address && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{settings.address}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2">Redes Sociais</h3>
              <div className="flex gap-3">
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 mt-6 pt-4 text-center text-sm opacity-60">
            Powered by Nex Drive
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      {settings.whatsapp_number && (
        <a
          href={`https://wa.me/${settings.whatsapp_number}?text=Ola! Vi um veiculo na loja virtual e gostaria de mais informacoes.`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg z-50 transition-transform hover:scale-110"
          title="Falar no WhatsApp"
        >
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
