export default function RatingCard({ type, icon, label, rating, description }) {
  return (
    <div className={`rating-card ${type}`}>
      <div className="rating-header">
        <div className="rating-title">
          <span>{icon}</span>
          <span>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="rating-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ opacity: i < rating ? 1 : 0.2 }}>★</span>
            ))}
          </span>
          <span className="rating-num">{rating}/5</span>
        </div>
      </div>
      <div className="rating-bar">
        <div className="rating-fill" style={{ width: `${(rating / 5) * 100}%` }} />
      </div>
      <p className="rating-desc">{description}</p>
    </div>
  )
}
