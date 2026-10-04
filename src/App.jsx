import { useEffect, useRef, useState } from 'react'
import ProductCard from './components/ProductCard.jsx'
import { apiRequest, clearAuthTokens, getRefreshToken, saveAuthTokens } from './api.js'

function App() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({ product_name: '', description: '', price: 0, quantity: 0 })
  const [editingId, setEditingId] = useState(null)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [showProductForm, setShowProductForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProduct, setSavingProduct] = useState(false)
  const [deletingProductIds, setDeletingProductIds] = useState(() => new Set())
  const savingProductRef = useRef(false)
  const deletingProductIdsRef = useRef(new Set())

  useEffect(() => {
    apiRequest('/me')
      .then((payload) => setUser(payload.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return

    apiRequest('/products')
      .then((payload) => setProducts(payload.data || []))
      .catch((requestError) => setError(requestError.message))
  }, [user])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = await apiRequest('/login', {
        method: 'POST',
        data: credentials,
      })
      saveAuthTokens(payload)
      setUser(payload.data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await apiRequest('/logout', { method: 'POST', data: { refresh_token: refreshToken } })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      clearAuthTokens()
      setUser(null)
      setProducts([])
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    if (savingProductRef.current) return

    savingProductRef.current = true
    setSavingProduct(true)
    setError('')

    try {
      await apiRequest(editingId ? `/products/${editingId}` : '/products', {
        method: editingId ? 'PUT' : 'POST',
        data: productForm,
      })
      const refreshedProducts = await apiRequest('/products')
      setProducts(refreshedProducts.data || [])
      resetProductForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      savingProductRef.current = false
      setSavingProduct(false)
    }
  }

  async function handleProductDelete(id) {
    if (deletingProductIdsRef.current.has(id)) return
    if (!window.confirm('Delete this product?')) return

    deletingProductIdsRef.current.add(id)
    setDeletingProductIds(new Set(deletingProductIdsRef.current))
    setError('')

    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' })
      setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      deletingProductIdsRef.current.delete(id)
      setDeletingProductIds(new Set(deletingProductIdsRef.current))
    }
  }

  function startEditing(product) {
    setEditingId(product.id)
    setShowProductForm(true)
    setProductForm({
      product_name: product.product_name || '',
      description: product.description || '',
      price: product.price || 0,
      quantity: product.quantity || 0,
    })
  }

  function resetProductForm() {
    setEditingId(null)
    setShowProductForm(false)
    setProductForm({ product_name: '', description: '', price: 0, quantity: 0 })
  }

  if (loading) {
    return <main className="app-shell"><p className="status">Connecting to LavaLust...</p></main>
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="page-title">
          <p className="eyebrow">React Portal / LavaLust API</p>
          <h1 id="page-title">Student Portal</h1>
          <p className="intro">Sign in to manage the products in your LavaLust application.</p>
          <p className="demo-credentials">Sample account: <strong>labadmin</strong> / <strong>Lab@12345</strong></p>
          <form className="login-form" onSubmit={handleLogin}>
            <label>Username<input required value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} /></label>
            <label>Password<input required type="password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit">Sign in</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><p className="eyebrow">React Portal / LavaLust API</p><h1>Products</h1></div>
        <div className="header-actions"><button type="button" disabled={savingProduct} onClick={() => setShowProductForm(!showProductForm)}>+ Add Product</button><span>Logged in as {user.username} | <button className="link-button" type="button" onClick={handleLogout}>Logout</button></span></div>
      </header>
      <section className="content-panel">
        {error && <p className="error" role="alert">{error}</p>}
        {showProductForm && <form className="product-form" onSubmit={handleProductSubmit}>
          <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
          <div className="form-fields">
            <label>Name<input required disabled={savingProduct} value={productForm.product_name} onChange={(event) => setProductForm({ ...productForm, product_name: event.target.value })} /></label>
            <label>Description<input disabled={savingProduct} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            <label>Price<input required disabled={savingProduct} type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
            <label>Quantity<input required disabled={savingProduct} type="number" min="0" value={productForm.quantity} onChange={(event) => setProductForm({ ...productForm, quantity: event.target.value })} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={savingProduct}>{savingProduct ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}</button>{editingId && <button className="cancel-button" type="button" disabled={savingProduct} onClick={resetProductForm}>Cancel</button>}</div>
        </form>}
        {products.length === 0 ? <p className="empty-state">No products found.</p> : (
          <div className="table-container"><table><thead><tr><th>ID</th><th>Product Name</th><th>Description</th><th>Price</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>
            {products.map((product) => <ProductCard key={product.id} product={product} deleting={deletingProductIds.has(product.id)} onEdit={startEditing} onDelete={handleProductDelete} />)}
          </tbody></table></div>
        )}
      </section>
    </main>
  )
}

export default App
