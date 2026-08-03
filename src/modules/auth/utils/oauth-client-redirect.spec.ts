import { AppReply } from '@common/http/app-http';
import {
    sendOAuthClientRedirect,
    stripTrailingEmptyHash,
} from './oauth-client-redirect';

describe('oauth-client-redirect', () => {
    describe('stripTrailingEmptyHash', () => {
        it('removes a trailing empty hash', () => {
            expect(stripTrailingEmptyHash('https://app.example/cb?code=x#')).toBe(
                'https://app.example/cb?code=x',
            );
        });

        it('keeps hash routes', () => {
            expect(
                stripTrailingEmptyHash('https://app.example/cb?code=x#/home'),
            ).toBe('https://app.example/cb?code=x#/home');
        });
    });

    describe('sendOAuthClientRedirect', () => {
        function mockReply() {
            const reply = {
                status: jest.fn().mockReturnThis(),
                header: jest.fn().mockReturnThis(),
                send: jest.fn().mockReturnThis(),
            };
            return reply as unknown as AppReply & {
                status: jest.Mock;
                header: jest.Mock;
                send: jest.Mock;
            };
        }

        it('uses location.replace HTML for http(s) without trailing hash', () => {
            const reply = mockReply();
            sendOAuthClientRedirect(
                reply,
                'http://localhost:3000/?code=TOKEN#',
            );

            expect(reply.status).toHaveBeenCalledWith(200);
            expect(reply.header).toHaveBeenCalledWith(
                'Content-Type',
                'text/html; charset=utf-8',
            );
            const html = reply.send.mock.calls[0][0] as string;
            expect(html).toContain(
                'window.location.replace("http://localhost:3000/?code=TOKEN")',
            );
            expect(html).not.toContain('?code=TOKEN#');
            expect(html).toContain(
                'content="0;url=http://localhost:3000/?code=TOKEN"',
            );
        });

        it('uses location.replace HTML for deep links without trailing hash', () => {
            const reply = mockReply();
            sendOAuthClientRedirect(reply, 'myapp://success?code=TOKEN#');

            expect(reply.status).toHaveBeenCalledWith(200);
            expect(reply.header).toHaveBeenCalledWith(
                'Content-Type',
                'text/html; charset=utf-8',
            );
            const html = reply.send.mock.calls[0][0] as string;
            expect(html).toContain(
                'window.location.replace("myapp://success?code=TOKEN")',
            );
            expect(html).not.toContain('?code=TOKEN#');
            expect(html).toContain(
                'content="0;url=myapp://success?code=TOKEN"',
            );
        });
    });
});
