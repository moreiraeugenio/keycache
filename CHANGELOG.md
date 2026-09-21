# Changelog

## [0.5.0](https://github.com/moreiraeugenio/keycache/compare/keycache-v0.4.1...keycache-v0.5.0) (2026-09-21)


### Features

* **about:** clickable "Check on GitHub" link ([122b345](https://github.com/moreiraeugenio/keycache/commit/122b34556339049d1ca66016e1b1c4c42cc01a6c))
* add settings and visibility shortcuts ([7e03822](https://github.com/moreiraeugenio/keycache/commit/7e03822dd0653aba2a0954222f57e591e0c90c4a))
* allow settings path override via env var ([09cceed](https://github.com/moreiraeugenio/keycache/commit/09cceedd700c43d2d109f8b9282ba022c18ce33b))
* **build:** set app icon for all platforms ([bdfcb54](https://github.com/moreiraeugenio/keycache/commit/bdfcb543e564dbf84b3655b87edbc6d70caaeedd))
* **build:** set app icon for all platforms ([3cbdb63](https://github.com/moreiraeugenio/keycache/commit/3cbdb63e6749b375caee0f0dd332ddcf9ff3c8a4))
* **debug:** flatten nested objects in log output ([674c1d8](https://github.com/moreiraeugenio/keycache/commit/674c1d8eac9c7b2a61c0636659c617c6cd08b4f3))
* **debug:** pretty-print details as JSON ([104eada](https://github.com/moreiraeugenio/keycache/commit/104eadac3a753655190cb768a90c12ceaebe21d3))
* log user actions and file IO in dev mode ([8e6fa9b](https://github.com/moreiraeugenio/keycache/commit/8e6fa9b60bf1719d9869afc11032dfa6146c4645))
* **release:** add one-command release flow ([6d0589b](https://github.com/moreiraeugenio/keycache/commit/6d0589b775ddcb445c9886d99b3a107e26920a2e))
* **release:** auto-pick bump from commit types ([3762192](https://github.com/moreiraeugenio/keycache/commit/3762192152bb72bc142bbecf6b933e513dc65281))
* **release:** distribute via Homebrew cask ([65ce950](https://github.com/moreiraeugenio/keycache/commit/65ce9502ae33b7f96ef3daedc22af3b2dd908e26))
* **release:** distribute via Homebrew cask ([a771b99](https://github.com/moreiraeugenio/keycache/commit/a771b993e949f6247f18c74651e952c556e16486))
* **settings:** add show on taskbar/dock toggle ([7e66d8b](https://github.com/moreiraeugenio/keycache/commit/7e66d8b32f056b45faf96f346086e9ee5f3a3ba5))
* **settings:** add start-at-login toggle ([333c2dd](https://github.com/moreiraeugenio/keycache/commit/333c2dd9b35a5d7871204ffd4d306c910430b1c6))
* **settings:** add start-at-login toggle ([4c9f2b2](https://github.com/moreiraeugenio/keycache/commit/4c9f2b24fd85edbe61911c8af170a33f160bf33c))
* **settings:** always-visible themed scrollbar ([15826c3](https://github.com/moreiraeugenio/keycache/commit/15826c37fba7a0d0d66ea09e071f2efa3497837c))
* **settings:** show on taskbar/dock toggle ([1cc1cf2](https://github.com/moreiraeugenio/keycache/commit/1cc1cf2d849bfac5f86f7e399e50d4cec1c3b0ac))
* **site:** add keycache.app landing page ([07709ab](https://github.com/moreiraeugenio/keycache/commit/07709ab77f8beebd5957e49dd3ba9c1ff342bf01))
* **site:** add keycache.app landing page ([0d25f78](https://github.com/moreiraeugenio/keycache/commit/0d25f784649d450e071aa011d3944036f132e8aa)), closes [#62](https://github.com/moreiraeugenio/keycache/issues/62)
* **site:** add robots, sitemap and rich results ([f9fe53c](https://github.com/moreiraeugenio/keycache/commit/f9fe53c8ceaf4d14e8523d6dd03f20cf50c81017)), closes [#61](https://github.com/moreiraeugenio/keycache/issues/61)
* **site:** show the logo mark above the wordmark ([4b8cc26](https://github.com/moreiraeugenio/keycache/commit/4b8cc268b470d1b4a58365a552c7f6884fe46ff1))
* support adopting an existing data file ([49a4e7e](https://github.com/moreiraeugenio/keycache/commit/49a4e7e07926ae7a2fdf180f86458a32b88d2c25))
* **tray:** distinct icon for packaged dev build ([8a0df64](https://github.com/moreiraeugenio/keycache/commit/8a0df64f6697d8ea6968771d7d5d5ee4a1a318a2))
* **tray:** use distinct icon in dev builds ([f4dfb98](https://github.com/moreiraeugenio/keycache/commit/f4dfb984cd45f20608a63a7110a0400a9b559368))


### Bug Fixes

* add missing productName property to package.json ([ec4e6d6](https://github.com/moreiraeugenio/keycache/commit/ec4e6d64c95b32925e2cf0242d1a848440bb7f7b))
* allow changing db path before first note ([d0c774f](https://github.com/moreiraeugenio/keycache/commit/d0c774f566e98dc3a8ef416dea585b382c48ff3e))
* **app:** reopen popup via did-become-active ([e09a29e](https://github.com/moreiraeugenio/keycache/commit/e09a29e15fb1329442a6c4cfffd9f8a33e489237))
* **app:** show window when dock icon is clicked ([19d61d7](https://github.com/moreiraeugenio/keycache/commit/19d61d72c5289be762a6fc8fab7ad61a109ecb4e))
* disable electron-builder auto-publish ([9453018](https://github.com/moreiraeugenio/keycache/commit/9453018376084b700455dc7d71a17d1f7d605098))
* hide dock at module load, not on whenReady ([296852d](https://github.com/moreiraeugenio/keycache/commit/296852d0ecbaacbdb49b94fe7016afa9c6959344))
* hide dock at module load, not on whenReady ([3395781](https://github.com/moreiraeugenio/keycache/commit/3395781d56c3069a91dde1da705ef813883c4365)), closes [#32](https://github.com/moreiraeugenio/keycache/issues/32)
* hide window on blur even with a dialog open ([4a47caf](https://github.com/moreiraeugenio/keycache/commit/4a47caf45c7755a22e5aa0e50571c892effbc100))
* prioritize KEYCACHE_DB_PATH over settings ([d697c47](https://github.com/moreiraeugenio/keycache/commit/d697c47029e02877f977d9a0551d572b1c119b82))
* refresh notes when data file path changes ([bae8ea3](https://github.com/moreiraeugenio/keycache/commit/bae8ea397b4035b79331365f370962257b528553))
* **release:** allow unpushed local commits ([4340fd4](https://github.com/moreiraeugenio/keycache/commit/4340fd4517d9f33eeea3e9180051c5e21a87672f))
* **release:** pre-fetch electron before tests ([e737683](https://github.com/moreiraeugenio/keycache/commit/e7376838c195a7bcf592e6d635c49d846d7663b3))
* **release:** repair electron framework symlink ([c3058cb](https://github.com/moreiraeugenio/keycache/commit/c3058cbbb5afcae32f8abe5d7bd9b4481611f0f5))
* **settings:** wrap long paths in warning ([cee2724](https://github.com/moreiraeugenio/keycache/commit/cee27240fc92ec5dbbef850f0571ba11888e29c3))
* **site:** drop cleanUrls to fix the root path ([c5f3939](https://github.com/moreiraeugenio/keycache/commit/c5f39395ba1be6eacde7055877a52e93c1a6ed76))
* toggle settings dialog and unstick blur-hide ([6d60c7b](https://github.com/moreiraeugenio/keycache/commit/6d60c7b53e342c121d4c8969e34c8f809b63f2f2))
* **window:** call app.hide to restore prior focus ([fd6cec4](https://github.com/moreiraeugenio/keycache/commit/fd6cec4b5a48cf075386fc92fcb18c4e2260dea7))
* **window:** use win.hide() so dock toggle works ([9f8c1ed](https://github.com/moreiraeugenio/keycache/commit/9f8c1edb683362cc1a83489ad4b3ad9f23e0ff21))
