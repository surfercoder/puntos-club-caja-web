import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { I18nProvider, useI18n, useT } from '@/contexts/I18nContext';
import { getActiveLang, setActiveLang, translate } from '@/i18n';
import { LANG_COOKIE } from '@/i18n/cookie';

function Probe() {
  const { lang, setLang } = useI18n();
  const t = useT();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="msg">{t('common.back')}</span>
      <button onClick={() => setLang('en')}>a ingles</button>
      <button onClick={() => setLang('pt' as 'es')}>a portugues</button>
    </div>
  );
}

afterEach(() => setActiveLang('es'));

describe('I18nProvider', () => {
  it('arranca en el idioma que le siembra el proxy', () => {
    render(
      <I18nProvider initialLang="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('msg')).toHaveTextContent(translate('en', 'common.back'));
    expect(getActiveLang()).toBe('en');
  });

  it('cambia de idioma y lo deja en la cookie', async () => {
    render(
      <I18nProvider initialLang="es">
        <Probe />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByText('a ingles'));

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(getActiveLang()).toBe('en');
    expect(document.cookie).toContain(`${LANG_COOKIE}=en`);
  });

  it('ignora un idioma que no existe', async () => {
    render(
      <I18nProvider initialLang="es">
        <Probe />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByText('a portugues'));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });
});

describe('sin provider', () => {
  it('traduce igual en el idioma por defecto, en vez de dejar la pantalla en blanco', () => {
    render(<Probe />);
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(screen.getByTestId('msg')).toHaveTextContent(translate('es', 'common.back'));
  });

  it('su setLang es un no-op', () => {
    render(<Probe />);
    act(() => {
      screen.getByText('a ingles').click();
    });
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });
});
