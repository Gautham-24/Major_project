import React, { useState, useEffect } from "react";
import "../Styles/RatingComponent.css";
import { FaStar } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const RatingComponent = ({
  rideId,
  driverId,
  driverName,
  onRatingSubmitted,
  readOnly = false,
  existingRating = 0,
}) => {
  const [rating, setRating] = useState(existingRating);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverRating, setDriverRating] = useState({ average: 0, total: 0 });
  const metaAccount = localStorage.getItem("metaAccount");

  useEffect(() => {
    // If readOnly, fetch the driver's average rating
    if (readOnly && driverId) {
      fetchDriverRating();
    }
  }, [driverId, readOnly]);

  const fetchDriverRating = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8080/api/drivers/${driverId}/rating`
      );
      if (response.data.success) {
        setDriverRating({
          average: response.data.averageRating,
          total: response.data.totalRatings,
        });
      }
    } catch (error) {
      console.error("Error fetching driver rating:", error);
    }
  };

  const handleRatingSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    if (!metaAccount) {
      toast.error("Please connect with MetaMask first");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `http://localhost:8080/api/rides/${rideId}/rate`,
        {
          clientAccount: metaAccount,
          score: rating,
        }
      );

      if (response.data.success) {
        toast.success("Rating submitted successfully!");
        if (onRatingSubmitted) {
          onRatingSubmitted(rating);
        }
      } else {
        toast.error(`Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Read-only display of driver's average rating
  if (readOnly) {
    return (
      <div className="driver-rating-display">
        <div className="stars-container">
          {[...Array(5)].map((_, i) => {
            const ratingValue = i + 1;
            return (
              <FaStar
                key={i}
                className="star"
                color={
                  ratingValue <= driverRating.average ? "#ffc107" : "#e4e5e9"
                }
                size={20}
              />
            );
          })}
        </div>
        <div className="rating-text">
          {driverRating.average > 0 ? (
            <span>
              {driverRating.average} ({driverRating.total} ratings)
            </span>
          ) : (
            <span>No ratings yet</span>
          )}
        </div>
      </div>
    );
  }

  // Interactive rating component
  return (
    <div className="rating-component">
      <h3>Rate your ride with {driverName || "Driver"}</h3>
      <p>How was your experience?</p>

      <div className="stars-container">
        {[...Array(5)].map((_, i) => {
          const ratingValue = i + 1;
          return (
            <label key={i}>
              <input
                type="radio"
                name="rating"
                value={ratingValue}
                onClick={() => setRating(ratingValue)}
              />
              <FaStar
                className="star"
                color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                size={30}
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(0)}
              />
            </label>
          );
        })}
      </div>

      {rating > 0 && (
        <div className="rating-label">
          {rating === 1 && "Poor"}
          {rating === 2 && "Fair"}
          {rating === 3 && "Good"}
          {rating === 4 && "Very Good"}
          {rating === 5 && "Excellent"}
        </div>
      )}

      <button
        className="submit-rating-button"
        onClick={handleRatingSubmit}
        disabled={isSubmitting || !rating}
      >
        {isSubmitting ? "Submitting..." : "Submit Rating"}
      </button>
    </div>
  );
};

export default RatingComponent;
