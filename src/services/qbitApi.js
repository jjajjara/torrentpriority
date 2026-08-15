/**
 * qBittorrent Web API v2 통신 모듈
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

    // 응답 인터셉터: 403 Forbidden 발생 시 세션 만료로 판단 후 재로그인
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.warn('[qBittorrent API] 세션이 만료되었거나 인증이 필요합니다. 재로그인을 시도합니다.');
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
   * qBittorrent 서버 로그인 및 인증 쿠키 획득
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
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }

      // Set-Cookie 헤더에서 모든 쿠키 추출하여 조합
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        this.cookieHeader = setCookieHeaders.map((cookie) => cookie.split(';')[0]).join('; ');
        this.httpClient.defaults.headers.common['Cookie'] = this.cookieHeader;
      }

      console.log('[qBittorrent API] 로그인 성공');
      return true;
    } catch (error) {
      console.error(`[qBittorrent API] 로그인 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 토렌트 목록 조회
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
      console.error(`[qBittorrent API] 토렌트 목록 조회 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 토렌트 삭제
   * @param {Array<string>} hashes - 삭제할 토렌트의 해시 목록
   * @param {boolean} deleteFiles - 실제 파일 삭제 여부
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
      console.error(`[qBittorrent API] 토렌트 삭제 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 토렌트 대기열 우선순위를 최하위로 이동
   * @param {Array<string>} hashes - 우선순위를 낮출 토렌트의 해시 목록
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
      console.error(`[qBittorrent API] 토렌트 우선순위 최하위 변경 실패: ${error.message}`);
      throw error;
    }
  }
}
