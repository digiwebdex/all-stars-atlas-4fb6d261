import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CmsPageContent } from "@/lib/cms-defaults";

// ====== FETCH PAGE CONTENT ======
// Fetches from API — no hardcoded fallbacks
export const useCmsPageContent = (slug: string) => {
  return useQuery<CmsPageContent>({
    queryKey: ["cms", "page", slug],
    queryFn: async () => {
      const data = await api.get<CmsPageContent>(`/cms/pages${slug.startsWith('/') ? slug : `/${slug}`}`);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// ====== FETCH ALL CMS PAGES (admin) ======
export const useCmsAllPages = () => {
  return useQuery<CmsPageContent[]>({
    queryKey: ["cms", "pages", "all"],
    queryFn: async () => {
      return await api.get<CmsPageContent[]>("/cms/pages");
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};

// ====== SAVE PAGE CONTENT (admin) ======
export const useCmsSavePage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: CmsPageContent) => {
      return await api.put<CmsPageContent>(`/cms/pages${content.slug.startsWith('/') ? content.slug : `/${content.slug}`}`, content);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["cms", "page", data.slug], data);
      queryClient.invalidateQueries({ queryKey: ["cms", "pages", "all"] });
    },
  });
};

// ====== SERVICE PAGE CONTENT ======
export const useCmsServiceContent = (service: string) => {
  const slug = service.startsWith("/") ? service : `/${service}`;
  return useCmsPageContent(slug);
};
