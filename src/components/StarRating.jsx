export default function StarRating({ rating, max = 5 }) {
  return (
    <span className="rating-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ opacity: i < rating ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  )
}
