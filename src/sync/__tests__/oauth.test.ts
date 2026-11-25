import { failedOAuthRedirect, googleClientIds } from '../oauth';

describe('googleClientIds', () => {
  it('needs the web client everywhere and the iOS client on iOS', () => {
    expect(googleClientIds('web', 'web-id', undefined)).toEqual({ webClientId: 'web-id' });
    expect(googleClientIds('android', 'web-id', undefined)).toEqual({ webClientId: 'web-id' });
    expect(googleClientIds('ios', 'web-id', 'ios-id')).toEqual({ webClientId: 'web-id', iosClientId: 'ios-id' });
    expect(googleClientIds('ios', 'web-id', undefined)).toBeNull();
    expect(googleClientIds('android', undefined, 'ios-id')).toBeNull();
    expect(googleClientIds('web', '', undefined)).toBeNull();
  });
});

describe('failedOAuthRedirect', () => {
  const error = { message: 'Unable to exchange external code' };
  const site = 'https://globik-app.netlify.app/account';

  it('ignores page loads that signed in fine or aren’t redirects', () => {
    expect(failedOAuthRedirect(`${site}?code=abc`, null)).toBeNull();
    expect(failedOAuthRedirect(site, error)).toBeNull();
  });

  it('reports a failed redirect and cleans the URL', () => {
    expect(
      failedOAuthRedirect(
        `${site}?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code`,
        error,
      ),
    ).toEqual({ message: error.message, cleanUrl: site });
    expect(failedOAuthRedirect(`${site}?code=abc&sb_flow_id=1&tab=2`, error)).toEqual({
      message: error.message,
      cleanUrl: `${site}?tab=2`,
    });
  });

  it('stays silent when the user cancelled on Google’s screen', () => {
    expect(failedOAuthRedirect(`${site}#error=access_denied&error_description=denied`, error)).toEqual({
      message: null,
      cleanUrl: site,
    });
  });
});
