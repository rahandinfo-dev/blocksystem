"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: (retry: () => void) => ReactNode };
type State = { failed: boolean; retryKey: number };
/** Local boundary: a failed optional feature cannot take down project editing. */
export class ComponentRecoveryBoundary extends Component<Props, State> {
  state: State = { failed: false, retryKey: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* Global UI intentionally receives no stack details. */ }
  retry = () => this.setState((value) => ({ failed: false, retryKey: value.retryKey + 1 }));
  render() { return this.state.failed ? this.props.fallback(this.retry) : <span key={this.state.retryKey}>{this.props.children}</span>; }
}
