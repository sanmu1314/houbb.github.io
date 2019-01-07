---
layout: post
title: Mongo 分片组件-40
date: 2018-12-10 11:35:23 +0800
categories: [sql]
tags: [sql, nosql, mongo, sh]
published: true
excerpt: Mongo 分片组件
---

# 组件

MongoDB分片群集包含以下组件：

- 分片

每个分片包含分片数据的子集。 

从MongoDB 3.6开始，必须将分片部署为副本集。

- mongos

mongos充当查询路由器，提供客户端应用程序和分片集群之间的接口。

- 配置服务器

配置服务器存储群集的元数据和配置设置。 

从MongoDB 3.4开始，配置服务器必须部署为副本集（CSRS）。

# 生产配置

在生产群集中，确保数据冗余并确保系统具有高可用性。 

对于生产分片集群部署，请考虑以下事项：

1. 将Config Server部署为3成员副本集

2. 将每个Shard部署为3个成员副本集

3. 部署一个或多个mongos路由器

## 分布式副本集

尽可能考虑在适合作为灾难恢复位置的站点中部署每个副本集的一个成员。

> 注意

跨两个数据中心分发副本集成员可以提供单个数据中心的优势。在两个数据中心分发中，

如果其中一个数据中心发生故障，则数据仍然可用于读取，这与单个数据中心分发不同。

如果具有少数成员的数据中心发生故障，则副本集仍可以提供写操作以及读操作。

但是，如果具有大多数成员的数据中心发生故障，则副本集将变为只读。

如果可能，请至少在三个数据中心分发成员。对于配置服务器副本集（CSRS），最佳做法是分配三个（或更多，具体取决于成员数量）中心。

如果第三个数据中心的成本过高，一种分配的可能性是将数据承载成员均匀地分布在两个数据中心并存储其余成员（数据承载成员或仲裁者以**确保成员数量奇数**）。

云，如果您的公司政策允许。

## 碎片数量

分片需要至少两个分片来分配分片数据。如果您计划在不久的将来启用分片，但在部署时不需要，则单个分片分片群集可能很有​​用。

## mongos数量和分布

部署多个mongos路由器支持高可用性和可扩展性。一种常见的模式是在每个应用程序服务器上放置一个mongos。在每个应用程序服务器上部署一个mongos路由器可以减少应用程序和路由器之间的网络延迟。

或者，您可以将mongos路由器放置在专用主机上。大型部署受益于此方法，因为它将客户端应用程序服务器的数量与mongos实例的数量分离。这样可以更好地控制mongod实例所服务的连接数。

在自己的主机上安装mongos实例允许这些实例使用更大量的内存。内存不会与mongod实例共享。可以使用主分片来托管mongos路由器，但要注意内存争用可能会成为大型部署的问题。

您可以在部署中使用mongos路由器的数量没有限制。但是，由于mongos路由器经常与您的配置服务器通信，因此在增加路由器数量时会密切监视配置服务器性能。如果您发现性能下降，那么限制部署中mongos路由器的数量可能会有所帮助。

![mongos数量和分布](https://docs.mongodb.com/manual/_images/sharded-cluster-production-architecture.bakedsvg.svg)

# 开发配置

对于测试和开发，您可以部署具有最少组件数量的分片集群。 

这些非生产集群具有以下组件：

1. 具有一个成员的副本集配置服务器。

2. 至少有一个分片作为单成员副本集。

3. 一个mongos实例。

![sharded-cluster-test-architecture.bakedsvg.svg](https://docs.mongodb.com/manual/_images/sharded-cluster-test-architecture.bakedsvg.svg)

> 仅使用测试群集体系结构进行测试和开发。

# 参考资料

https://docs.mongodb.com/manual/core/sharded-cluster-components/

* any list
{:toc}