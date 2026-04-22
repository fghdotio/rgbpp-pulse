## Claude Opus 4.6 实现 RGB++ 资产管理的网页应用

ccc 最新代码（其中包含 rgbpp package）用这个：https://github.com/fghdotio/ccc/tree/feat/rgbpp-btc

RGB++ 代码示例参考 https://github.com/ckb-devrel/ccc/tree/rgbpp-sdk/packages/rgbpp/src/examples，实际代码实现有更新，以最新代码为准进行适配。

## 功能需求

### UI 设计

使用 design.md。

### RGB++ 交易状态追踪

由于 RGB++ 交易链路长，做一个实时追踪并展示交易状态的页面，要求展示清晰、美观、易懂、有信息量。

### 个人 RGB++ 资产管理

RGB++ 资产包括 UDT 和 Spore。

钱包连接的功能参考 https://github.com/fghdotio/ccc/tree/feat/rgbpp-btc/packages/demo 的代码。

获取个人资产汇总的方式参考参考接口列表： https://api-testnet.rgbpp.com/docs/static/index.html

#### RGB++ UDT 资产管理

实现示例脚本里的 UDT 功能，包括 Leap to BTC，Transfer on BTC，Leap to CKB。

#### RGB++ Spore 资产管理

实现示例脚本里的 Spore 功能，包括 Leap to BTC，Transfer on BTC，Leap to CKB。

## Notes

不要参考 rgbpp-agent-gemini 的代码和设计。
