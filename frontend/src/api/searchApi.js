import api from "./axios";

export async function searchGlobal(query) {
  const response = await api.get("/api/search", {
    params: {
      q: query
    }
  });

  console.log("Search API response:", response.data);

  return response.data.data;
}