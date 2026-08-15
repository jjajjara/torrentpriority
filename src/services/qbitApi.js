/**
 * qBittorrent Web API v2 communication module
 */
import axios from 'axios';

export class QbitApiClient {
  /**
   * @param {Object} config
   * @param {string} config.qbitUrl
   * @param {string} config.qbitUsername
   * @param {string} config.qbitPassword
   */
  constructor(config) {
    this.baseUrl = config.qbitUrl;
    this.username = config.qbitUsername;
    this.password = config.qbitPassword;
    this.cookieHeader = null;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': this.baseUrl,
        'Origin': this.baseUrl
      }
    });

    // Response interceptor: Re-login on 403 Forbidden
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.warn('[qBittorrent API] Session expired or unauthorized. Attempting to re-login...');
          await this.login();
          if (this.cookieHeader) {
            originalRequest.headers['Cookie'] = this.cookieHeader;
          }
          return this.httpClient(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Login to qBittorrent WebUI and obtain authentication cookie
   */
  async login() {
    try {
      const params = new URLSearchParams();
      params.append('username', this.username);
      params.append('password', this.password);

      const response = await axios.post(`${this.baseUrl}/api/v2/auth/login`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseUrl,
          'Origin': this.baseUrl
        },
        timeout: 10000
      });

      if (response.data === 'Fails.') {
        throw new Error('Invalid username or password.');
      }

      // Extract and combine all Set-Cookie headers
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        this.cookieHeader = setCookieHeaders.map((cookie) => cookie.split(';')[0]).join('; ');
        this.httpClient.defaults.headers.common['Cookie'] = this.cookieHeader;
      }

      console.log('[qBittorrent API] Successfully logged in');
      return true;
    } catch (error) {
      console.error(`[qBittorrent API] Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch list of torrents
   * @param {string} [filter='all']
   * @returns {Promise<Array<Object>>}
   */
  async fetchTorrentList(filter = 'all') {
    try {
      const response = await this.httpClient.get('/api/v2/torrents/info', {
        params: { filter }
      });
      return response.data;
    } catch (error) {
      console.error(`[qBittorrent API] Failed to fetch torrent list: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete torrents by hash
   * @param {Array<string>} hashes - List of torrent hashes to delete
   * @param {boolean} deleteFiles - Whether to delete downloaded data files
   * @returns {Promise<boolean>}
   */
  async deleteTorrents(hashes, deleteFiles = false) {
    if (!hashes || hashes.length === 0) {
      return false;
    }

    try {
      const params = new URLSearchParams();
      params.append('hashes', hashes.join('|'));
      params.append('deleteFiles', deleteFiles ? 'true' : 'false');

      await this.httpClient.post('/api/v2/torrents/delete', params.toString());
      return true;
    } catch (error) {
      console.error(`[qBittorrent API] Failed to delete torrents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Move torrents to the bottom of the queue priority
   * @param {Array<string>} hashes - List of torrent hashes to demote
   * @returns {Promise<boolean>}
   */
  async moveTorrentsToBottomPriority(hashes) {
    if (!hashes || hashes.length === 0) {
      return false;
    }

    try {
      const params = new URLSearchParams();
      params.append('hashes', hashes.join('|'));

      await this.httpClient.post('/api/v2/torrents/bottomPrio', params.toString());
      return true;
    } catch (error) {
      console.error(`[qBittorrent API] Failed to demote torrent priority: ${error.message}`);
      throw error;
    }
  }
}
