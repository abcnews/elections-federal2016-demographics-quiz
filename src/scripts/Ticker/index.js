const yo = require('yo-yo');

const ITEMS_PATTERN = /([\w\d-\+<>]+(?:\/[\w\d-\+<>]+)+)/;
const NON_ALPHANUMERIC_PATTERN = /[\W_]+/g;
const TICK_PERIOD = 1500;

const ticker = ($title) => {
	if ($title.find('.Ticker').length) {
		return;
	}

	const titleText = $title.text();
	const itemsMatch = ITEMS_PATTERN.exec(titleText);

	if (itemsMatch === null) {
		return;
	}

	const itemsText = itemsMatch[0];
	const surroundingText = titleText.split(itemsText);

	const items = itemsText.split('/').map((text, index) => {
		return {
			text,
			index,
			slug: text.replace(NON_ALPHANUMERIC_PATTERN, '')
		};
	});

	const tickerEl = view(items);

	if (tickerEl.style.animationName === undefined) {
		return;
	}

	$title.empty().append([
		surroundingText[0],
		tickerEl,
		surroundingText[1]
	]);

	setInterval(() => {
		items.unshift(items.pop());
		yo.update(tickerEl, view([])); // Empty first so initial animations play later
		yo.update(tickerEl, view(items.filter((item, index) => { return index < 2; })));
	}, TICK_PERIOD);
};

const view = (items) => {
	return yo`<div class="Ticker">
		${items.map((item) => {
			return yo`<div class="TickerItem TickerItem--${item.index} TickerItem--${item.slug}">${item.text}</div>`;
		})}
	</div>`;
};

module.exports = ticker;