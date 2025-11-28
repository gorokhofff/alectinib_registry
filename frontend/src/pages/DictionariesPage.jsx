import React, { useState, useEffect } from 'react'
import { dictionaryService } from '../services/dictionaryService'
import './DictionariesPage.css'

function DictionariesPage() {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [dictionaries, setDictionaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    category: '',
    code: '',
    value_ru: '',
    sort_order: 0
  })

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadDictionaries()
    }
  }, [selectedCategory])

  const loadCategories = async () => {
    try {
      const data = await dictionaryService.getCategories()
      setCategories(data)
      if (data.length > 0) {
        setSelectedCategory(data[0])
      }
    } catch (err) {
      console.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDictionaries = async () => {
    try {
      setLoading(true)
      const data = await dictionaryService.getDictionaries(selectedCategory)
      setDictionaries(data)
    } catch (err) {
      console.error('Error loading dictionaries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormData({
      category: selectedCategory,
      code: '',
      value_ru: '',
      sort_order: dictionaries.length + 1
    })
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      category: item.category,
      code: item.code,
      value_ru: item.value_ru,
      sort_order: item.sort_order
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      return
    }

    try {
      await dictionaryService.deleteDictionary(id)
      loadDictionaries()
    } catch (err) {
      alert('Ошибка удаления')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingItem) {
        await dictionaryService.updateDictionary(editingItem.id, formData)
      } else {
        await dictionaryService.createDictionary(formData)
      }
      setShowModal(false)
      loadDictionaries()
    } catch (err) {
      alert('Ошибка сохранения')
    }
  }

  if (loading && categories.length === 0) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="dictionaries-page">
      <div className="page-header">
        <h2>Управление справочниками</h2>
        <button onClick={handleAdd} className="btn btn-primary">
          + Добавить запись
        </button>
      </div>

      <div className="dictionaries-layout">
        <div className="categories-sidebar">
          <h3>Категории</h3>
          <div className="category-list">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-item ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="dictionaries-content">
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : (
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Код</th>
                    <th>Значение</th>
                    <th>Порядок</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {dictionaries.map(item => (
                    <tr key={item.id}>
                      <td><code>{item.code}</code></td>
                      <td>{item.value_ru}</td>
                      <td>{item.sort_order}</td>
                      <td>
                        <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {item.is_active ? 'Активно' : 'Неактивно'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(item)}
                            className="btn btn-secondary btn-sm"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Редактирование записи' : 'Новая запись'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Категория</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                    disabled={!!editingItem}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Код</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Значение</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.value_ru}
                    onChange={(e) => setFormData({...formData, value_ru: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Порядок сортировки</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DictionariesPage
