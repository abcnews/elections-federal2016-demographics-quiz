module.exports = {
	contentftp: {
		credentials: ".abc-credentials",
		targetName: "contentftp",
		target: "/www/res/sites/news-projects/elections-federal2016-demographics-quiz/",
		files: [{
			expand: true,
			cwd: 'build/',
			src: ["**/*"]
		}]
	}
};
