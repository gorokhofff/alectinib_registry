import api from './api'

// Кэш для справочников
const dictionaryCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

export const dictionaryService = {
  /**
   * Получить справочники с кэшированием
   * @param {string|null} category - Категория справочника (опционально)
   * @param {boolean} forceRefresh - Принудительное обновление кэша
   * @returns {Promise<Array>} Массив справочников
   */
  async getDictionaries(category = null, forceRefresh = false) {
    const cacheKey = category || 'all'
    const cached = dictionaryCache.get(cacheKey)
    
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    const params = category ? { category } : {}
    const response = await api.get('/dictionaries', { params })
    
    // Сохраняем в кэш
    dictionaryCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    })
    
    return response.data
  },

  /**
   * Получить несколько категорий справочников одновременно
   * @param {Array<string>} categories - Массив категорий
   * @returns {Promise<Object>} Объект с ключами-категориями и значениями-массивами справочников
   */
  async getMultipleDictionaries(categories) {
    const results = {}
    await Promise.all(
      categories.map(async (category) => {
        results[category] = await this.getDictionaries(category)
      })
    )
    return results
  },

  async getCategories() {
    const response = await api.get('/dictionaries/categories')
    return response.data
  },

  async createDictionary(data) {
    const response = await api.post('/dictionaries', data)
    // Очищаем кэш при изменении данных
    dictionaryCache.clear()
    return response.data
  },

  async updateDictionary(id, data) {
    const response = await api.put(`/dictionaries/${id}`, data)
    // Очищаем кэш при изменении данных
    dictionaryCache.clear()
    return response.data
  },

  async deleteDictionary(id) {
    const response = await api.delete(`/dictionaries/${id}`)
    // Очищаем кэш при изменении данных
    dictionaryCache.clear()
    return response.data
  },

  /**
   * Очистить кэш справочников
   */
  clearCache() {
    dictionaryCache.clear()
  }
}
