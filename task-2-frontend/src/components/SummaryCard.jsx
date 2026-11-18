
const SummaryCard = ({
  title,
  value,
  description,
  icon,
  iconColor = "bg-blue-50 text-blue-600",
}) => {
  return (
    <article
      className="bg-white border border-gray-200
        rounded-xl p-4 sm:p-5 shadow-sm
        min-h-[125px] flex items-center
        justify-between gap-3
        transition-shadow hover:shadow-md"
    >

      <div className="min-w-0">

        <p className="text-sm font-medium text-gray-500">
          {title}
        </p>

        <h2 className="text-2xl sm:text-3xl
          font-bold text-gray-900 mt-3
          tracking-tight tabular-nums">
          {value}
        </h2>

        <p className="text-xs text-gray-400 mt-2">
          {description}
        </p>

      </div>

      <div className={`w-12 h-12 rounded-xl
        shrink-0 flex items-center justify-center
        text-xl font-bold ${iconColor}`}>
        <span aria-hidden="true">{icon}</span>
      </div>

    </article>
  );
};

export default SummaryCard;
