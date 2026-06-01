export const qk = {
  clients: {
    root: ["clients"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["clients", "list", filters] as const) : (["clients", "list"] as const),
    detail: (id: number | string) => ["clients", "detail", String(id)] as const,
    bannedBesins: (id: number | string) => ["clients", String(id), "banned-besins"] as const,
    consents: (id: number | string) => ["clients", String(id), "consents"] as const,
    progress: (id: number | string) => ["clients", String(id), "progress"] as const,
  },
  diets: {
    root: ["diets"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["diets", "list", filters] as const) : (["diets", "list"] as const),
    detail: (id: number | string) => ["diets", "detail", String(id)] as const,
    byClient: (clientId: number | string) => ["diets", "by-client", String(clientId)] as const,
    latest: (clientId: number | string) => ["diets", "latest", String(clientId)] as const,
    messages: (dietId: number | string) => ["diets", String(dietId), "messages"] as const,
  },
  besinler: {
    root: ["besinler"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["besinler", "list", filters] as const) : (["besinler", "list"] as const),
    detail: (id: number | string) => ["besinler", "detail", String(id)] as const,
  },
  birims: { root: ["birims"] as const, list: () => ["birims", "list"] as const },
  templates: {
    root: ["templates"] as const,
    list: () => ["templates", "list"] as const,
    detail: (id: number | string) => ["templates", "detail", String(id)] as const,
  },
  presets: { root: ["presets"] as const, list: () => ["presets", "list"] as const },
  definitions: { root: ["definitions"] as const, list: () => ["definitions", "list"] as const },
  exercises: {
    byClient: (clientId: number | string, range?: { from?: string; to?: string }) =>
      ["exercises", String(clientId), range ?? null] as const,
  },
  notifications: {
    logs: ["notifications", "logs"] as const,
    preferences: ["notifications", "preferences"] as const,
  },
  stats: {
    overview: ["stats", "overview"] as const,
    usage: ["stats", "usage"] as const,
  },
  client: {
    portal: {
      overview: ["client", "portal", "overview"] as const,
      diet: (dietId: number | string) => ["client", "portal", "diet", String(dietId)] as const,
      conversations: ["client", "portal", "conversations"] as const,
    },
  },
  birthdays: {
    today: ["birthdays", "today"] as const,
  },
  importantDates: {
    root: ["important-dates"] as const,
  },
} as const;
