export function MapScreen() {
  return (
    <div className="px-5 pt-10 pb-28 text-center">
      <div className="text-7xl">📍</div>
      <h1 className="mt-6 text-2xl font-bold text-[#1A1AFF]">Live Location</h1>
      <p className="mt-3 text-[#888] max-w-xs mx-auto">
        Real-time location sharing coming soon. You will be able to see your entire squad on a live map.
      </p>
      <button disabled className="mt-8 w-full py-4 rounded-2xl bg-[#1a1a3a] border border-[#2a2a4a] text-[#888] font-semibold cursor-not-allowed">
        Share My Location — Coming Soon
      </button>
    </div>
  );
}
