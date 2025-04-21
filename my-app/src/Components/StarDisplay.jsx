import React from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

/**
 * A component to display a star rating
 * @param {Object} props
 * @param {number} props.rating - The rating value (1-5)
 * @param {boolean} props.showText - Whether to show the rating value as text
 * @param {number} props.size - Size of the stars
 * @param {string} props.fullColor - Color of full stars
 * @param {string} props.emptyColor - Color of empty stars
 */
const StarDisplay = ({
  rating,
  showText = true,
  size = 20,
  fullColor = "#ffc107",
  emptyColor = "#e4e5e9",
}) => {
  // Convert rating to a number and ensure it's in range 0-5
  const numericRating = Number(rating) || 0;
  const safeRating = Math.min(5, Math.max(0, numericRating));

  // Generate the stars
  const stars = [];
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating % 1 >= 0.5;

  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <FaStar
        key={`star-${i}`}
        size={size}
        color={fullColor}
        style={{ marginRight: 2 }}
      />
    );
  }

  // Add half star if needed
  if (hasHalfStar) {
    stars.push(
      <FaStarHalfAlt
        key="half-star"
        size={size}
        color={fullColor}
        style={{ marginRight: 2 }}
      />
    );
  }

  // Add empty stars
  const emptyStarsCount = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStarsCount; i++) {
    stars.push(
      <FaRegStar
        key={`empty-${i}`}
        size={size}
        color={emptyColor}
        style={{ marginRight: 2 }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex" }}>{stars}</div>
      {showText && (
        <span style={{ marginLeft: 5, fontSize: size * 0.8 }}>
          {safeRating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarDisplay;
