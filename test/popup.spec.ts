import { expect } from 'chai';
import * as puppeteer from 'puppeteer';

(process.env.TRAVIS ? describe.skip : describe)('popup', () => {
  before(async function before() {
    this.timeout(5000);
    const extensionPath = process.cwd();
    const browser = await puppeteer.launch({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      headless: false,
    });
    this.browser = browser;

    const extensionPage = await browser.newPage();
    const extensionPopupHtml = 'resources/popup.html';
    const extensionID = ((targets): string => {
      const extensionTarget = targets.find(target => target.type() === 'background_page');
      const [, , id] = extensionTarget.url().split('/');
      return id;
    })(await browser.targets());
    await extensionPage.goto(`chrome-extension://${extensionID}/${extensionPopupHtml}`);
    this.extensionPage = extensionPage;
  });

  after(async function after() {
    const browser = (this.browser as puppeteer.Browser);
    browser && browser.close();
  });

  it('it should return a page title', async function it() {
    const extensionPage = (this.extensionPage as puppeteer.Page);
    const title = await extensionPage.$('title')
      .then(element => element.getProperty('textContent'))
      .then(property => property.jsonValue());
    expect(title).to.equal('Send Unipos together');
  });
});
