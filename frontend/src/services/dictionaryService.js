
import api from './api'

export const dictionaryService = {
  async getDictionaries(category = null) {
    const params = category ? { category } : {}
    const response = await api.get('/dictionaries', { params })
    return response.data
  },

  async getCategories() {
    const response = await api.get('/dictionaries/categories')
    return response.data
  },

  async createDictionary(data) {
    const response = await api.post('/dictionaries', data)
    return response.data
  },

  async updateDictionary(id, data) {
    const response = await api.put(`/dictionaries/${id}`, data)
    return response.data
  },

  async deleteDictionary(id) {
    const response = await api.delete(`/dictionaries/${id}`)
    return response.data
  },
}
