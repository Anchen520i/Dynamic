<div align="center">

<img src="./icon/Mystic.png" width="96" alt="Mystic icon" />

# M Y S T I C

**Intelligent by Design. Precise by Nature.**

为 Surge iOS 与 macOS 打造的精细化网络策略配置。  
**应用独立出口 · Smart 智能选路 · 加密 DNS · 可审计的规则体系**

![Surge](https://img.shields.io/badge/Surge-iOS%20%26%20macOS-111827?style=for-the-badge&logo=apple&logoColor=white)
![Routing](https://img.shields.io/badge/Routing-Rule%20Based-5b7fff?style=for-the-badge)
![DNS](https://img.shields.io/badge/DNS-DoH-12bfa7?style=for-the-badge)
![License](https://img.shields.io/badge/Resources-User%20Configured-8b5cf6?style=for-the-badge)

[配置下载](#配置入口) · [策略架构](#策略架构) · [应用出口](#应用级独立出口) · [分流顺序](#分流优先级) · [使用说明](#快速开始)

</div>

> [!IMPORTANT]
> 本仓库提供配置、规则与脚本资源，不提供代理节点。配置中的 `policy-path=订阅链接`、`http://sol/...` 和 `http://astra/...` 为需自行配置的订阅或自定义资源映射，不应假定可在其他设备直接使用。请先使用本地副本验证。

## 配置入口

| 平台 | 主配置 | 使用说明 |
|:---:|:---|:---|
| **iOS** | [Surge_iOS.conf](./File/Surge_iOS.conf) | iPhone / iPad，支持当前配置的 Surge 版本 |
| **macOS** | [Surge_MacOS.conf](./File/Surge_MacOS.conf) | Mac，包含独立的 HTTP API / MCP 设置 |

**原始文件地址：** [iOS](https://raw.githubusercontent.com/Vaerios/Nyora/Surge/File/Surge_iOS.conf) · [macOS](https://raw.githubusercontent.com/Vaerios/Nyora/Surge/File/Surge_MacOS.conf)

## 策略架构

<div align="center">
  <img src="./assets/routing-architecture.svg" alt="Mystic 智能分流架构" width="100%" />
</div>

> 图示反映当前配置的主要策略关系，而不是完整的 Surge 内部执行时序。SVG 使用轻量 CSS 动画；在不支持动画的 GitHub 客户端中仍可作为静态图显示。

Mystic 是节点订阅池；五个地区 `smart` 策略组通过 `include-other-group=Mystic` 引入并按节点名称筛选。`Proxy` 是默认代理策略，业务组既可以跟随 `Proxy`，也可以独立选择地区。

## 应用级独立出口

<div align="center">
  <img src="./assets/application-policies.svg" alt="Mystic 应用级独立出口" width="100%" />
</div>

**当前业务策略组：** `Ai`、`Bilibili`、`Disney`、`Netflix`、`Spotify`、`Telegram`、`TikTok`、`Twitter`、`YouTube`。

> [!TIP]
> 示例：`Proxy` 选择香港，`Ai` 选择美国，`YouTube` 选择日本，`Bilibili` 保持 `DIRECT`。这些策略彼此独立，前提是请求实际命中对应规则集。

## 分流优先级

<div align="center">
  <img src="./assets/rule-priority.svg" alt="Mystic 分流优先级" width="100%" />
</div>

当前 iOS 主配置从 `DOMAIN,msmp.abchina.com.cn,REJECT` 开始，依次为 Apple 直连、各业务规则集、China 直连、内置 LAN / SYSTEM、`GEOIP,CN,DIRECT`，最后由 `FINAL,Proxy,dns-failed` 兜底。macOS 的首项不同：使用 `RULE-SET,http://sol/Adobe,REJECT`。

**注意：** `Ai` 与 `Twitter` 的 `grok.com`、`TikTok` 与 `China` 的 `snssdk.com` 等规则存在跨文件覆盖关系；应按实际业务意图判断，不能仅为了去重而删除。

## 目录导航

| 路径 | 内容 |
|---|---|
| [`File/`](./File) | iOS 与 macOS 主配置 |
| [`Rule/`](./Rule) | Apple、AI、国内网络、流媒体、社交及其他规则集 |
| [`Module/`](./Module) | Google Rewrite、YouTube、流量展示等 Surge 模块 |
| [`Script/`](./Script) | 配套脚本及 YouTube 子目录 |
| [`MCP/`](./MCP) | 网络状态、分流规则、连接问题的诊断提示词 |
| [`icon/`](./icon) | 策略组与服务图标 |
| [`traffic_circle.svg`](./traffic_circle.svg) | 流量展示 SVG 资源 |

## 快速开始

1. **下载配置**：选择适合设备的 `.conf` 文件，在 Surge 中导入本地副本。
2. **填写订阅**：将 `Mystic` 策略组中的 `policy-path=订阅链接` 替换为自己的 Surge 格式订阅地址。
3. **接通规则资源**：将 `http://sol/Apple`、`http://sol/Ai` 等映射到可访问的规则内容；若没有相应的自定义映射，改为完整 HTTPS 规则文件地址。
4. **接通图标资源**：`http://astra/...` 为自定义图标地址。无法访问时可使用本仓库 `icon/` 目录中的图片或删除 `icon-url` 参数。
5. **验证策略**：确认规则加载成功、地区组存在节点，并逐项检查 Apple、国内网站、AI、视频及局域网访问。

例如，若不使用自定义规则映射，可在自己的配置副本中将：

```ini
RULE-SET,http://sol/Ai,Ai
```

改为：

```ini
RULE-SET,https://raw.githubusercontent.com/Vaerios/Nyora/Surge/Rule/Ai.list,Ai
```

这只是**资源地址替换示例**，并不意味着所有规则均适用于任何设备、地区或订阅。

## DNS 与网络兼容

当前配置采用阿里 DNS 和 DNSPod 的 DoH 服务，启用 `hijack-dns = *:53`，并为局域网配置了绕过范围。iOS 还包含 `always-real-ip = *.lan, *.local`。

- `always-real-ip` 不等于强制直连；需要结合局域网 DNS 和设备发现测试。
- `skip-proxy` 与 `tun-excluded-routes` 作用不同，不宜直接合并理解。
- `100.64.0.0/10` 涉及共享地址空间，使用虚拟组网时应检查其排除行为。
- `http-api-mcp = true` 是当前配置中的 MCP 开关；远程控制能力还取决于实际监听、连接与授权设置。
- `[MITM]` 段存在不代表所有 HTTPS 流量都在被解密；使用模块前应核实其要求。

## 使用与安全说明

> [!WARNING]
> 公开仓库中不要提交真实订阅链接、控制器密码、MITM 证书或其他凭据。当前主配置包含 HTTP API 认证字段；在公开分享前应替换为非真实值，并轮换任何已暴露的有效凭据。历史提交也可能保留敏感信息。

本项目不是 Surge 官方产品，也不保证节点可用性、流媒体解锁或任何第三方服务的可访问性。第三方规则、脚本及资源须遵循各自许可。使用前建议备份配置，调整时一次只改动一项并检查 Surge 请求日志。

## 参考

[Surge 官方手册](https://manual.nssurge.com/) · [Surge iOS 6](https://nssurge.com/surge-ios-6) · [Loyalsoldier GeoIP](https://github.com/Loyalsoldier/geoip)

---

<div align="center">

**MYSTIC** · A clearer route for every connection.

<sub>Designed for control. Built for clarity.</sub>

</div>
