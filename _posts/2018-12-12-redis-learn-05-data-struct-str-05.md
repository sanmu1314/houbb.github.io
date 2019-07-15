---
layout: post
title: Redis Learn-05-数据结构之 SDS
date: 2018-12-12 11:35:23 +0800
categories: [Redis]
tags: [redis, cache, data-struct, sh]
published: true
---

# 问题

## 概念

## 为什么这么设计

## 和 C 字符串的区别

## 怎么实现的

# 简单动态字符串

Redis 没有直接使用 C 语言传统的字符串表示（以空字符结尾的字符数组，以下简称 C 字符串）， 而是自己构建了一种名为简单动态字符串（simple dynamic string，SDS）的抽象类型， 并将 SDS 用作 Redis 的默认字符串表示。

在 Redis 里面， C 字符串只会作为字符串字面量（string literal）， 用在一些无须对字符串值进行修改的地方， 比如打印日志：

```c
redisLog(REDIS_WARNING,"Redis is now ready to exit, bye bye...");
```

当 Redis 需要的不仅仅是一个字符串字面量， 而是一个可以被修改的字符串值时， Redis 就会使用 SDS 来表示字符串值： 

比如在 Redis 的数据库里面， 包含字符串值的键值对在底层都是由 SDS 实现的。

举个例子， 如果客户端执行命令：

```c
redis> SET msg "hello world"
OK
```

那么 Redis 将在数据库中创建了一个新的键值对， 其中：

键值对的键是一个字符串对象， 对象的底层实现是一个保存着字符串 "msg" 的 SDS 。

键值对的值也是一个字符串对象， 对象的底层实现是一个保存着字符串 "hello world" 的 SDS 。

又比如说， 如果客户端执行命令：

```
redis> RPUSH fruits "apple" "banana" "cherry"
(integer) 3
```

那么 Redis 将在数据库中创建一个新的键值对， 其中：

键值对的键是一个字符串对象， 对象的底层实现是一个保存了字符串 "fruits" 的 SDS 。

键值对的值是一个列表对象， 列表对象包含了三个字符串对象， 这三个字符串对象分别由三个 SDS 实现： 第一个 SDS 保存着字符串 "apple" ， 第二个 SDS 保存着字符串 "banana" ， 第三个 SDS 保存着字符串 "cherry" 。

除了用来保存数据库中的字符串值之外， SDS 还被用作缓冲区（buffer）： AOF 模块中的 AOF 缓冲区， 以及客户端状态中的输入缓冲区， 都是由 SDS 实现的， 在之后介绍 AOF 持久化和客户端状态的时候， 我们会看到 SDS 在这两个模块中的应用。

本章接下来将对 SDS 的实现进行介绍， 说明 SDS 和 C 字符串的不同之处， 解释为什么 Redis 要使用 SDS 而不是 C 字符串， 并在本章的最后列出 SDS 的操作 API 。


# SDS 的定义

## 结构定义

每个 `sds.h/sdshdr` 结构表示一个 SDS 值：

```c
struct sdshdr {

    // 记录 buf 数组中已使用字节的数量
    // 等于 SDS 所保存字符串的长度
    int len;

    // 记录 buf 数组中未使用字节的数量
    int free;

    // 字节数组，用于保存字符串
    char buf[];

};
```

free 属性的值为 0 ， 表示这个 SDS 没有分配任何未使用空间。

len 属性的值为 5 ， 表示这个 SDS 保存了一个五字节长的字符串。

buf 属性是一个 char 类型的数组， 数组的前五个字节分别保存了 'R' 、 'e' 、 'd' 、 'i' 、 's' 五个字符， 而最后一个字节则保存了空字符 '\0' 。

![SDS 的定义](http://redisbook.com/_images/graphviz-72760f6945c3742eca0df91a91cc379168eda82d.png)

SDS 遵循 C 字符串以空字符结尾的惯例， 保存空字符的 1 字节空间不计算在 SDS 的 len 属性里面， 并且为空字符分配额外的 1 字节空间， 以及添加空字符到字符串末尾等操作都是由 SDS 函数自动完成的， 所以这个空字符对于 SDS 的使用者来说是完全透明的。

遵循空字符结尾这一惯例的好处是， **SDS 可以直接重用一部分 C 字符串函数库里面的函数。**

举个例子， 如果我们有一个指向图 2-1 所示 SDS 的指针 s ， 那么我们可以直接使用 stdio.h/printf 函数， 通过执行以下语句：

```c
printf("%s", s->buf);
```

来打印出 SDS 保存的字符串值 "Redis"， 而无须为 SDS 编写专门的打印函数。

图 2-2 展示了另一个 SDS 示例:

这个 SDS 和之前展示的 SDS 一样， 都保存了字符串值 "Redis" 。

这个 SDS 和之前展示的 SDS 的区别在于， 这个 SDS 为 buf 数组分配了五字节未使用空间， 所以它的 free 属性的值为 5 （图中使用五个空格来表示五字节的未使用空间）。

![SDS 示例](http://redisbook.com/_images/graphviz-5fccf03155ec72c7fb2573bed9d53bf8f8fb7878.png)


# SDS 与 C 字符串的区别

根据传统， C 语言使用长度为 N+1 的字符数组来表示长度为 N 的字符串，并且字符数组的最后一个元素总是空字符 '\0' 。

比如说， 图 2-3 就展示了一个值为 "Redis" 的 C 字符串：

```
digraph {

    label = "\n 图 2-3    C 字符串";

    rankdir = LR;

    node [shape = record];

    //

    buf [label = "{ 'R' | 'e' | 'd' | 'i' | 's' | '\\0' }"];

}
```

C 语言使用的这种简单的字符串表示方式，并不能满足 Redis 对字符串在安全性、效率、以及功能方面的要求， 本节接下来的内容将详细对比 C 字符串和 SDS 之间的区别， 并说明 SDS 比 C 字符串更适用于 Redis 的原因。

## 常数复杂度获取字符串长度

因为 C 字符串并不记录自身的长度信息， 所以为了获取一个 C 字符串的长度， 程序必须遍历整个字符串， 对遇到的每个字符进行计数， 直到遇到代表字符串结尾的空字符为止， 这个操作的复杂度为 O(N) 。

举个例子， 图 2-4 展示了程序计算一个 C 字符串长度的过程。

![C 字符串长度的](http://redisbook.com/_images/graphviz-11db45788777fdf62308ab859e5e4418276616b1.png)

和 C 字符串不同， 因为 SDS 在 len 属性中记录了 SDS 本身的长度， 所以获取一个 SDS 长度的复杂度仅为 O(1) 。

举个例子， 对于图 2-5 所示的 SDS 来说， 程序只要访问 SDS 的 len 属性， 就可以立即知道 SDS 的长度为 5 字节：

![5字节长的 SDS](http://redisbook.com/_images/graphviz-dbd2f4d49a9f495f18093129393569f93e645529.png)

又比如说， 对于图 2-6 展示的 SDS 来说， 程序只要访问 SDS 的 len 属性， 就可以立即知道 SDS 的长度为 11 字节。

![11 字节的 SDS](http://redisbook.com/_images/graphviz-33b39668e26fa63350b177c13b38f201fcebb6c4.png)

设置和更新 SDS 长度的工作是由 SDS 的 API 在执行时自动完成的， 使用 SDS 无须进行任何手动修改长度的工作。

通过使用 SDS 而不是 C 字符串， Redis 将获取字符串长度所需的复杂度从 O(N) 降低到了 O(1) ， 这确保了获取字符串长度的工作不会成为 Redis 的性能瓶颈。

比如说， 因为字符串键在底层使用 SDS 来实现， 所以即使我们对一个非常长的字符串键反复执行 STRLEN 命令， 也不会对系统性能造成任何影响， 因为 STRLEN 命令的复杂度仅为 O(1) 。

# 杜绝缓冲区溢出

除了获取字符串长度的复杂度高之外， C 字符串不记录自身长度带来的另一个问题是容易造成缓冲区溢出（buffer overflow）。

举个例子， `<string.h>/strcat` 函数可以将 src 字符串中的内容拼接到 dest 字符串的末尾：

```c
char *strcat(char *dest, const char *src);
```

因为 C 字符串不记录自身的长度，所以 strcat 假定用户在执行这个函数时，已经为 dest 分配了足够多的内存，可以容纳 src 字符串中的所有内容， 而一旦这个假定不成立时，就会产生缓冲区溢出。

举个例子，假设程序里有两个在内存中紧邻着的 C 字符串 s1 和 s2，其中 s1 保存了字符串 "Redis"， 而 s2 则保存了字符串 "MongoDB" ， 如图 2-7 所示。

![2-7 内存中相邻的两个字符串](http://redisbook.com/_images/graphviz-7daf86931b270e1f4bacf20e3f56ebcb2fc7e08e.png)

如果一个程序员决定通过执行：

```
strcat(s1, " Cluster");
```

将 s1 的内容修改为 "Redis Cluster" ， 但粗心的他却忘了在执行 strcat 之前为 s1 分配足够的空间，

那么在 strcat 函数执行之后， s1 的数据将溢出到 s2 所在的空间中， 导致 s2 保存的内容被意外地修改， 如图 2-8 所示。

![2-8 s1 的内容溢出到 s2 所在的位置](http://redisbook.com/_images/graphviz-2ff855d462d63f935deedb05c0d6447ed4b44bb3.png)

与 C 字符串不同， SDS 的空间分配策略完全杜绝了发生缓冲区溢出的可能性： 

当 SDS API 需要对 SDS 进行修改时， API 会先检查 SDS 的空间是否满足修改所需的要求， 如果不满足的话， API 会自动将 SDS 的空间扩展至执行修改所需的大小， 然后才执行实际的修改操作， 所以使用 SDS 既不需要手动修改 SDS 的空间大小， 也不会出现前面所说的缓冲区溢出问题。

举个例子， SDS 的 API 里面也有一个用于执行拼接操作的 sdscat 函数， 它可以将一个 C 字符串拼接到给定 SDS 所保存的字符串的后面， 但是在执行拼接操作之前， sdscat 会先检查给定 SDS 的空间是否足够， 如果不够的话， sdscat 就会先扩展 SDS 的空间， 然后才执行拼接操作。

比如说， 如果我们执行：

```c
sdscat(s, " Cluster");
```

其中 SDS 值 s 如图 2-9 所示， 那么 sdscat 将在执行拼接操作之前检查 s 的长度是否足够，

在发现 s 目前的空间不足以拼接 " Cluster" 之后， sdscat 就会先扩展 s 的空间， 然后才执行拼接 " Cluster" 的操作， 拼接操作完成之后的 SDS 如图 2-10 所示。

![2-9](http://redisbook.com/_images/graphviz-87e1f7dda1bde2b3dd53c143a12a3a12ec1949b7.png)

![2-10](http://redisbook.com/_images/graphviz-87e1f7dda1bde2b3dd53c143a12a3a12ec1949b7.png)

注意图 2-10 所示的 SDS ： sdscat 不仅对这个 SDS 进行了拼接操作， 它还为 SDS 分配了 13 字节的未使用空间， 并且拼接之后的字符串也正好是 13 字节长， 这种现象既不是 bug 也不是巧合， 它和 SDS 的空间分配策略有关， 接下来的小节将对这一策略进行说明。

## 减少修改字符串时带来的内存重分配次数

正如前两个小节所说， 因为 C 字符串并不记录自身的长度， 所以对于一个包含了 N 个字符的 C 字符串来说， 这个 C 字符串的底层实现总是一个 N+1 个字符长的数组（额外的一个字符空间用于保存空字符）。

因为 C 字符串的长度和底层数组的长度之间存在着这种关联性， 所以每次增长或者缩短一个 C 字符串， 程序都总要对保存这个 C 字符串的数组进行一次内存重分配操作：

如果程序执行的是增长字符串的操作， 比如拼接操作（append）， 那么在执行这个操作之前， 程序需要先通过内存重分配来扩展底层数组的空间大小 —— 如果忘了这一步就会产生缓冲区溢出。

如果程序执行的是缩短字符串的操作， 比如截断操作（trim）， 那么在执行这个操作之后， 程序需要通过内存重分配来释放字符串不再使用的那部分空间 —— 如果忘了这一步就会产生内存泄漏。

举个例子， 如果我们持有一个值为 "Redis" 的 C 字符串 s ， 那么为了将 s 的值改为 "Redis Cluster" ， 在执行：

```c
strcat(s, " Cluster");
```

之前， 我们需要先使用内存重分配操作， 扩展 s 的空间。

之后， 如果我们又打算将 s 的值从 "Redis Cluster" 改为 "Redis Cluster Tutorial" ， 那么在执行：

```c
strcat(s, " Tutorial");
```

之前， 我们需要再次使用内存重分配扩展 s 的空间， 诸如此类。

因为内存重分配涉及复杂的算法， 并且可能需要执行系统调用， 所以它通常是一个比较耗时的操作：

在一般程序中， 如果修改字符串长度的情况不太常出现， 那么每次修改都执行一次内存重分配是可以接受的。

但是 Redis 作为数据库， 经常被用于速度要求严苛、数据被频繁修改的场合， 如果每次修改字符串的长度都需要执行一次内存重分配的话， 那么光是执行内存重分配的时间就会占去修改字符串所用时间的一大部分， 如果这种修改频繁地发生的话， 可能还会对性能造成影响。

为了避免 C 字符串的这种缺陷， SDS 通过未使用空间解除了字符串长度和底层数组长度之间的关联： 在 SDS 中， buf 数组的长度不一定就是字符数量加一， 数组里面可以包含未使用的字节， 而这些字节的数量就由 SDS 的 free 属性记录。

通过未使用空间， SDS 实现了空间预分配和惰性空间释放两种优化策略。

### 空间预分配

空间预分配用于优化 SDS 的字符串增长操作： 当 SDS 的 API 对一个 SDS 进行修改， 并且需要对 SDS 进行空间扩展的时候， 程序不仅会为 SDS 分配修改所必须要的空间， 还会为 SDS 分配额外的未使用空间。

- 分配公式

其中， 额外分配的未使用空间数量由以下公式决定：

如果对 SDS 进行修改之后， SDS 的长度（也即是 len 属性的值）将小于 1 MB ， 那么程序分配和 len 属性同样大小的未使用空间， 这时 SDS len 属性的值将和 free 属性的值相同。 举个例子， 如果进行修改之后， SDS 的 len 将变成 13 字节， 那么程序也会分配 13 字节的未使用空间， SDS 的 buf 数组的实际长度将变成 13 + 13 + 1 = 27 字节（额外的一字节用于保存空字符）。

如果对 SDS 进行修改之后， SDS 的长度将大于等于 1 MB ， 那么程序会分配 1 MB 的未使用空间。 

- 例子

举个例子， 如果进行修改之后， SDS 的 len 将变成 30 MB ， 那么程序会分配 1 MB 的未使用空间， SDS 的 buf 数组的实际长度将为 30 MB + 1 MB + 1 byte 。

通过**空间预分配策略， Redis 可以减少连续执行字符串增长操作所需的内存重分配次数。**

举个例子， 对于图 2-11 所示的 SDS 值 s 来说， 如果我们执行：

```c
sdscat(s, " Cluster");
```

那么 sdscat 将执行一次内存重分配操作， 将 SDS 的长度修改为 13 字节， 并将 SDS 的未使用空间同样修改为 13 字节， 如图 2-12 所示。

![2-11](http://redisbook.com/_images/graphviz-75c915b3f40fc1586e518b42830a3d8ba4119cf7.png)

![2-12](http://redisbook.com/_images/graphviz-42ee54f9997d36b2b8ffb0ab75dce2fd509882db.png)

如果这时， 我们再次对 s 执行：

```c
sdscat(s, " Tutorial");
```

那么这次 sdscat 将不需要执行内存重分配： 因为未使用空间里面的 13 字节足以保存 9 字节的 " Tutorial" ， 执行 sdscat 之后的 SDS 如图 

![2-13](http://redisbook.com/_images/graphviz-3398fdf9cc2ab046814e2721f69cc4ed97f043ab.png)

在扩展 SDS 空间之前， SDS API 会先检查未使用空间是否足够， 如果足够的话， API 就会直接使用未使用空间， 而无须执行内存重分配。

通过这种预分配策略， SDS 将连续增长 N 次字符串所需的内存重分配次数从必定 N 次降低为最多 N 次。

### 惰性空间释放

惰性空间释放用于优化 SDS 的字符串缩短操作： 

当 SDS 的 API 需要缩短 SDS 保存的字符串时， 程序并不立即使用内存重分配来回收缩短后多出来的字节， 而是使用 free 属性将这些字节的数量记录起来， 并等待将来使用。

举个例子， sdstrim 函数接受一个 SDS 和一个 C 字符串作为参数， 从 SDS 左右两端分别移除所有在 C 字符串中出现过的字符。

比如对于图 2-14 所示的 SDS 值 s 来说， 执行：

```c
sdstrim(s, "XY");   // 移除 SDS 字符串中的所有 'X' 和 'Y'
```

会将 SDS 修改成图 2-15 所示的样子。

![2-14](http://redisbook.com/_images/graphviz-e0b39c48a2c522f5f7802f1e325b5cb25ac92579.png)

![2-15](http://redisbook.com/_images/graphviz-c58adbc4441b5622084daeee71c0cb306db28741.png)


注意执行 sdstrim 之后的 SDS 并没有释放多出来的 8 字节空间， 而是将这 8 字节空间作为未使用空间保留在了 SDS 里面， 如果将来要对 SDS 进行增长操作的话，这些未使用空间就可能会派上用场。

举个例子， 如果现在对 s 执行：

```c
sdscat(s, " Redis");
```

那么完成这次 sdscat 操作将不需要执行内存重分配： 因为 SDS 里面预留的 8 字节空间已经足以拼接 6 个字节长的 " Redis" ， 如图 2-16 所示。

![2-16](http://redisbook.com/_images/graphviz-d518d01875adb59245dce35983eab3528f2e59ea.png)

通过惰性空间释放策略， SDS 避免了缩短字符串时所需的内存重分配操作， 并为将来可能有的增长操作提供了优化。

与此同时， SDS 也提供了相应的 API ， 让我们可以在有需要时， 真正地释放 SDS 里面的未使用空间， 所以不用担心惰性空间释放策略会造成内存浪费。

# 二进制安全

C 字符串中的字符必须符合某种编码（比如 ASCII）， 并且除了字符串的末尾之外， 字符串里面不能包含空字符， 否则最先被程序读入的空字符将被误认为是字符串结尾 —— 这些限制使得 C 字符串只能保存文本数据， 而不能保存像图片、音频、视频、压缩文件这样的二进制数据。

举个例子， 如果有一种使用空字符来分割多个单词的特殊数据格式， 如图 2-17 所示， 那么这种格式就不能使用 C 字符串来保存， 因为 C 字符串所用的函数只会识别出其中的 "Redis" ， 而忽略之后的 "Cluster" 。

![2-17](http://redisbook.com/_images/graphviz-0fcb9185ccc066e9f298c00d8fd272f52cd1e43d.png)

虽然数据库一般用于保存文本数据， 但使用数据库来保存二进制数据的场景也不少见， 因此， 为了确保 Redis 可以适用于各种不同的使用场景， SDS 的 API 都是二进制安全的（binary-safe）： 所有 SDS API 都会以处理二进制的方式来处理 SDS 存放在 buf 数组里的数据， 程序不会对其中的数据做任何限制、过滤、或者假设 —— 数据在写入时是什么样的， 它被读取时就是什么样。

这也是我们将 SDS 的 buf 属性称为字节数组的原因 —— Redis 不是用这个数组来保存字符， 而是用它来保存一系列二进制数据。

比如说， 使用 SDS 来保存之前提到的特殊数据格式就没有任何问题， 因为 SDS 使用 len 属性的值而不是空字符来判断字符串是否结束， 如图 2-18 所示。

![二进制安全](http://redisbook.com/_images/graphviz-a34fffb686d81038f6bafbca7be99831df8b3e6b.png)

通过使用二进制安全的 SDS ， 而不是 C 字符串， 使得 Redis 不仅可以保存文本数据， 还可以保存任意格式的二进制数据。

# 兼容部分 C 字符串函数

虽然 SDS 的 API 都是二进制安全的， 但它们一样遵循 C 字符串以空字符结尾的惯例： 

这些 API 总会将 SDS 保存的数据的末尾设置为空字符， 并且总会在为 buf 数组分配空间时多分配一个字节来容纳这个空字符。

这是为了让那些保存文本数据的 SDS 可以重用一部分 `<string.h>` 库定义的函数。

![2-19](http://redisbook.com/_images/graphviz-82a01911a9b47725ee97416aac875752fa3bdd2b.png)

举个例子， 如图 2-19 所示， 如果我们有一个保存文本数据的 SDS 值 sds ， 那么我们就可以重用 <string.h>/strcasecmp 函数， 使用它来对比 SDS 保存的字符串和另一个 C 字符串：

```c
strcasecmp(sds->buf, "hello world");
```

这样 Redis 就不用自己专门去写一个函数来对比 SDS 值和 C 字符串值了。

与此类似， 我们还可以将一个保存文本数据的 SDS 作为 strcat 函数的第二个参数， 将 SDS 保存的字符串追加到一个 C 字符串的后面：

```c
strcat(c_string, sds->buf);
```

这样 Redis 就不用专门编写一个将 SDS 字符串追加到 C 字符串之后的函数了。

通过遵循 C 字符串以空字符结尾的惯例， SDS 可以在有需要时重用 `<string.h>` 函数库， 从而避免了不必要的代码重复。

# 个人收获

## 如何提升性能

可能会变长：内存预分配

可能会变短：惰性删除

## 利用已有的资源

直接兼容 c 的字符串，可以复用原来很多的 api 和已有的实现。

这对于其他设计，也是个非常好的启发。

## 安全的二进制

字符串存储总会存在编码，特殊符号的问题。

使用二进制存储，就可以避免很多类似的问题。

## 透明性

其实比如 GC 内存的自动分配，都应该交给程序本身实现，而不应该将这种复杂性暴露给客户。

# 参考资料

http://redisbook.com/preview/sds/different_between_sds_and_c_string.html

* any list
{:toc}