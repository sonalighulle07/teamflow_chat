export default function ViewPlanModal({ plan, onClose }) {
  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full max-w-[400px] bg-white rounded-lg shadow-xl p-6">
        <h3 className="text-lg font-medium text-gray-600 mb-5 ml-3.5">
          Plan Details
        </h3>

        <div className="grid grid-cols-2 gap-y-3 mr-2 ml-3 text-sm text-gray-600">
          <p><span className="font-medium">Name :</span> {plan.plan}</p>
          <p><span className="font-medium">Days :</span> {plan.days}</p>
          <p><span className="font-medium">Price :</span> ₹{plan.price.toLocaleString()}</p>
          <p><span className="font-medium">Size :</span> {plan.size}</p>
          <p>
            <span className="font-medium">Status :</span>{" "}
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ml-2 ${plan.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
            <span className={plan.status === "active" ? "text-green-500" : "text-red-500"}>
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </span>
          </p>
          <p><span className="font-medium">Start date :</span> {plan.startDate}</p>
          <p><span className="font-medium">Expiry date :</span> {plan.expiryDate}</p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-5 text-gray-400 hover:text-gray-600 text-[13px]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
