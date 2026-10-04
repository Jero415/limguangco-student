function ProductCard({ product, deleting, onEdit, onDelete }) {
  return (
    <tr>
      <td>{product.id}</td>
      <td>{product.product_name}</td>
      <td>{product.description || 'No description'}</td>
      <td>₱{Number(product.price).toFixed(2)}</td>
      <td>{product.quantity}</td>
      <td className="table-actions"><button type="button" disabled={deleting} onClick={() => onEdit(product)}>Edit</button><button className="delete-button" type="button" disabled={deleting} onClick={() => onDelete(product.id)}>{deleting ? 'Deleting...' : 'Delete'}</button></td>
    </tr>
  )
}

export default ProductCard
