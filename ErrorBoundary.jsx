import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Operations Hub rendering error", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section
          className="w-full max-w-lg rounded-2xl border border-red-900 bg-slate-900 p-6 shadow-xl"
          role="alert"
        >
          <p className="text-sm font-medium text-red-300">Application error</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Operations Hub could not display this page
          </h1>
          <p className="mt-3 text-slate-400">
            Your saved records have not been changed. Reload the application and
            try again. If the problem continues, contact the application
            administrator.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 min-h-11 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Reload application
          </button>
        </section>
      </main>
    );
  }
}
