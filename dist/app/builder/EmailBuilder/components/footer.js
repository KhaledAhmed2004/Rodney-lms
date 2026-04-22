"use strict";
/**
 * Footer Component
 *
 * A footer with company info, social links, and unsubscribe link.
 *
 * @example
 * ```typescript
 * builder.addComponent('footer', {
 *   showSocial: true,
 *   showCompanyInfo: true,
 *   unsubscribeUrl: 'https://example.com/unsubscribe',
 *   customText: 'Thanks for being a valued customer!'
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.footer = void 0;
const footer = (props, theme) => {
    const { showSocial = true, showCompanyInfo = true, unsubscribeUrl, customText, } = props;
    // Social icons with brand colors
    const socialIcons = [
        { name: 'facebook', key: 'facebook', color: '#3b5998' },
        { name: 'twitter', key: 'twitter', color: '#1da1f2' },
        { name: 'instagram', key: 'instagram', color: '#e1306c' },
        { name: 'linkedin', key: 'linkedin', color: '#0077b5' },
        { name: 'youtube', key: 'youtube', color: '#ff0000' },
    ];
    const socialHtml = showSocial && theme.social ? `
    <div style="margin-bottom: ${theme.spacing.md};">
      ${socialIcons
        .filter(icon => { var _a; return (_a = theme.social) === null || _a === void 0 ? void 0 : _a[icon.key]; })
        .map(icon => {
        var _a;
        return `
          <a href="${(_a = theme.social) === null || _a === void 0 ? void 0 : _a[icon.key]}" target="_blank" style="
            display: inline-block;
            margin: 0 6px;
            text-decoration: none;
          ">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
              <tr>
                <td align="center" style="
                  background-color: ${icon.color};
                  color: #FFFFFF;
                  border-radius: 4px;
                  padding: 4px 8px;
                  font-size: 11px;
                  font-weight: bold;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                ">
                  ${icon.name}
                </td>
              </tr>
            </table>
          </a>
        `;
    }).join('')}
    </div>
  ` : '';
    const companyHtml = showCompanyInfo && theme.company ? `
    <div style="margin-bottom: ${theme.spacing.md};">
      <p style="margin: 0; font-weight: bold;">${theme.company.name}</p>
      ${theme.company.address ? `<p style="margin: 4px 0 0 0;">${theme.company.address}</p>` : ''}
      ${theme.company.phone ? `<p style="margin: 4px 0 0 0;">Phone: ${theme.company.phone}</p>` : ''}
      ${theme.company.email ? `<p style="margin: 4px 0 0 0;">Email: ${theme.company.email}</p>` : ''}
    </div>
  ` : '';
    const customTextHtml = customText ? `
    <p style="margin: 0 0 ${theme.spacing.md} 0;">${customText}</p>
  ` : '';
    const unsubscribeHtml = unsubscribeUrl ? `
    <p style="margin: ${theme.spacing.md} 0 0 0;">
      <a href="${unsubscribeUrl}" style="color: ${theme.colors.textMuted}; text-decoration: underline;">
        Unsubscribe from these emails
      </a>
    </p>
  ` : '';
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="
          padding: ${theme.spacing.xl} 0 ${theme.spacing.md} 0;
          border-top: 1px solid ${theme.colors.border};
          color: ${theme.colors.textMuted};
          font-family: ${theme.fonts.primary};
          font-size: 13px;
          line-height: 1.5;
        ">
          ${customTextHtml}
          ${socialHtml}
          ${companyHtml}
          ${unsubscribeHtml}
        </td>
      </tr>
    </table>
  `.trim();
};
exports.footer = footer;
exports.default = exports.footer;
