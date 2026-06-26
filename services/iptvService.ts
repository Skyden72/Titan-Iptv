export class IptvService {
  async fetchData() {
    return window.titon.getCatalog();
  }
}
