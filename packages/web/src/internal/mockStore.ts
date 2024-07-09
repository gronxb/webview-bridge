export const mockStore = () => ({
  state: {},
  getState() {
    return this.state;
  },
  subscribe() {
    return () => {};
  },
});
