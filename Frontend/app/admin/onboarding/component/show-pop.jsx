
export default function ShowPop({ showSuccessModal, setShowSuccessModal }) {

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a] p-8 text-center shadow-2xl">

                {/* Success Logo */}
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-9 w-9 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 className="mb-2 text-2xl font-bold text-white">
                    Onboarding Successfully Completed!
                </h2>

                {/* Message */}
                <p className="mb-7 text-sm leading-6 text-slate-400">
                    All employee details have been successfully submitted
                    and the onboarding process is complete.
                </p>

                {/* Button */}
                <button
                    type="button"
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}