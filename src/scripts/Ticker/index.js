const yo = require('yo-yo');

const ITEMS_PATTERN = /(\[.*\])/;
const NON_ALPHANUMERIC_PATTERN = /[\W_]+/g;
const TICK_PERIOD = 1500;

const ticker = ($title) => {
	if ($title.find('.Ticker').length) {
		return;
	}

	const titleText = $title.text();
	const itemsMatches = ITEMS_PATTERN.exec(titleText);

	if (itemsMatches === null) {
		return;
	}

	const itemsMatch = itemsMatches[0];
	const surroundingText = titleText.split(itemsMatch);
	const itemsText = itemsMatch.slice(1,-1);

	const items = itemsText.split('/').map((text, index) => {
		return {
			text,
			index,
			slug: text.replace(NON_ALPHANUMERIC_PATTERN, '')
		};
	});

	const $ruler = $('<span/>');

	$title.empty().append($ruler);

	let width = 0;
	let height = 0;

	items.forEach((item, index) => {
		$ruler.text(item.text);
		width = Math.max(width, $ruler.width());

		if (index === 0) {
			height = $ruler.height();
		}
	});

	const tickerEl = view(items, width, height);

	if (tickerEl.style.animationName === undefined) {
		$title.html(surroundingText[0] + itemsText + surroundingText[1]);

		return;
	}

	$title.empty().append([
		surroundingText[0],
		tickerEl,
		surroundingText[1]
	]);

	setInterval(() => {
		items.unshift(items.pop());
		yo.update(tickerEl, view([], width, height)); // Empty first so initial animations play later
		yo.update(tickerEl, view(items.filter((item, index) => { return index < 2; }), width, height));
	}, TICK_PERIOD);
};

const view = (items, width, height) => {
	return yo`<div class="Ticker" style="width: ${width}px; height: ${height}px;">
		${items.map((item) => {
			return yo`<div class="TickerItem TickerItem--${item.index} TickerItem--${item.slug}">${item.text}</div>`;
		})}
	</div>`;
};

module.exports = ticker;