import PropTypes from "prop-types";

export default function BaseCard({ className = "", children }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${className}`.trim()}>
      {children}
    </div>
  );
}

BaseCard.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
