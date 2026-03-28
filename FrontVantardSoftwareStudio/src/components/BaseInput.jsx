import PropTypes from "prop-types";

export default function BaseInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  autoComplete,
  required,
  disabled,
  error,
  rightAdornment,
  inputClassName = "",
}) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-900">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={
            `h-11 w-full rounded-md border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 disabled:bg-gray-50 disabled:text-gray-500 disabled:placeholder:text-gray-400 disabled:cursor-not-allowed ` +
            (rightAdornment ? "pr-10 " : "") +
            (error
              ? "border-red-300 focus-visible:ring-red-500/30 hover:border-red-300 "
              : "border-gray-200 ") +
            inputClassName
          }
        />

        {rightAdornment ? (
          <div className="absolute inset-y-0 right-0 flex items-center">{rightAdornment}</div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

BaseInput.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  autoComplete: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  rightAdornment: PropTypes.node,
  inputClassName: PropTypes.string,
};
