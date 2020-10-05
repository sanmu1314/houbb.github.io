---
layout: post
title:  Cache Travel-09-java 从零开始手写 redis（11）clock时钟页面置换算法详解及实现
date:  2018-09-01 12:24:42 +0800
categories: [Cache]
tags: [cache, redis, lru, sh]
published: true
---

# 前言

[java从零手写实现redis（一）如何实现固定大小的缓存？](https://mp.weixin.qq.com/s/6J2K2k4Db_20eGU6xGYVTw)

[java从零手写实现redis（三）redis expire 过期原理](https://mp.weixin.qq.com/s/BWfBc98oLqhAPLN2Hgkwow)

[java从零手写实现redis（三）内存数据如何重启不丢失？](https://mp.weixin.qq.com/s/G41SRZQm1_0uQXBAGHAYbw)

[java从零手写实现redis（四）添加监听器](https://mp.weixin.qq.com/s/6pIG3l_wkXBwSuJvj_KwMA)

[java从零手写实现redis（五）过期策略的另一种实现思路](https://mp.weixin.qq.com/s/Atrd36UGds9_w_NFQDoEQg)

[java从零手写实现redis（六）AOF 持久化原理详解及实现](https://mp.weixin.qq.com/s/rFuSjNF43Ybxy-qBCtgasQ)

[java从零开始手写 redis（七）LRU 缓存淘汰策略详解](https://mp.weixin.qq.com/s/X-OIqu_rgLskvbF2rZMP6Q)

前面我们实现了 FIFO/LRU/LFU 等常见的淘汰策略，不过在操作系统中，实际上使用的是时钟页面置换算法。

LRU 的性能确实很好，不过比较消耗内存，而且实现比较麻烦。

时钟页面置换算法就是一种近似 LRU 的算法实现，可以看作是对 FIFO 算法的改进。

# Clock 页面置换算法

## 为什么需要 clock 算法？

LRU算法的性能接近于OPT,但是实现起来比较困难，且开销大；FIFO算法实现简单，但性能差。

所以操作系统的设计者尝试了很多算法，试图用比较小的开销接近LRU的性能，这类算法都是CLOCK算法的变体。

由于该算法循环地检查各页面的情况，故称为CLOCK算法，又称为最近未用(Not Recently Used, NRU)算法。

## 基本思路

需要用到页表项的访问位（access bit），当一个页面被装入内存时，把该位初始化为0，然后如果这个页被访问（读/写）时，硬件把它置为1.

把各个页面组织成环形链表（类似钟表面），把指针指向最老的页面（最先进来）；

当发生一个缺页中断，考察指针所指向的最老的页面，若它的访问为为0，则立即淘汰。若访问为1，则把该位置为0，然后指针往下移动一格。如此下去，直到找到被淘汰的页面，然后把指针移动到它的下一格。

## 个人疑惑

（1）如果找了一圈发现元素都是 1 怎么办？

是不是直接默认取第一个元素，这样认为就是回到了朴素的 FIFO 机制。

（2）访问的性能问题

这里的遍历可以认为是一个循环链表：

每一个节点内容：

```
K key;
boolean accessFlag;
```

朴素的 FIFO 非常简单，直接往队列中扔元素就行，然后淘汰最老的一个元素。

这个如果真的使用链表作为数据结构，那么查找，更新时间复杂度就是 O(N)，显然性能一般。

能想到的方案就是 HashMap 中存储 key+双向链表节点。

和性能改进版本的 LRU 对比，就是每次更新不做节点的移除调整，而只是更新对应的标志位。

## 简单的CLOCK算法

是通过给每一个访问的页面关联一个附加位(reference bit)，有些地方也叫做使用位(use bit)。

他的主要思想是：当某一页装入主存时，将use bit初始化为0；如果该页之后又被访问到，使用位也还是标记成1。

对于页面置换算法，候选的帧集合可以看成是一个循环缓冲区，并且有一个指针和缓冲区相关联。遇到页面替换时，指针指向缓冲区的下一帧。

如果这页进入主存后发现没有空余的帧(frame)，即所有页面的使用位均为1，那么这时候从指针开始循环一个缓冲区，将之前的使用位都清0，并且留在最初的位置上，换出该桢对应的页。

ps: 这里发现没有空余的帧，会将所有使用位都清零。


## 例子

以下面这个页面置换过程为例，访问的页面依次是:1,2,3,4,1,2,5,1,2,3,4,5。

主存有4个空闲的帧，每个页面对应的结构为(页面号，使用位)。

最开始页面号1进入主存，主存里面有空闲的帧，将其使用位记成1，由于主存中之前没有页面1，所以会发生缺页中断。

同理随后的页面2，3，4进入主存，将其使用位记成1，发生缺页中断。

当之后的页面1，2进入主存时，由于页面1,2已经在主存中，不做处理。

当之后的页面5进入主存时，主存内没有空余的帧，这时候随着指针循环移动整个缓冲区，将之前页面的使用位全部清0，即这时候页面1,2,3,4对应的使用位全部为0，指针回到最初的位置，将页面1替换出去，页面5换入主存，同时使用位标记成1。

以此类推，可知CLOCK共发生10次缺页中断。

![输入图片说明](https://images.gitee.com/uploads/images/2020/1004/100507_a42bb2a6_508704.png)

# Gclock(Generalized clock page replacement algorithm)

## 算法思想

该算法是Clock的变种。

相对于Clock标志位采用的是二进制0和1表示，Gclock的标志位采用的是一个整数，意味着理论上可以一直增加到无穷大。

## 工作原理

（1）当待缓存对象在缓存中时，把其标记位的值加1。同时，指针指向该对象的下一个对象。

（2）若不在缓存中时，检查指针指向对象的标记位。如果是0，则用待缓存对象替换该对象；否则，把标记位的值减1，指针指向下一个对象。如此直到淘汰一个对象为止。由于标记位的值允许大于1，所以指针可能循环多遍才淘汰一个对象。

ps: 这个有点类似于简化版本的 LFU，统计了对应的出现次数。

# WSclock(Working set clock page replacement algorithm)

## 算法思想

该算法同样是clock的变种，可能是实际运用最广泛的算法。

它采用clock的原理，是ws算法的增强版。

算法数据结构为循环链表，每个缓存对象保存了"最近使用的时间"rt和"是否引用"的R标志位,使用一个周期计时器t。age表示为当前时间和rt的差值

## 工作原理

（1）当待缓存对象存在缓存中时，更新rt为当前时间。同时，指针指向该对象的下一个对象。

（2）若不存在于缓存中时，如果缓存没满，则更新指针指向位置的rt为当前时间,R为1。同时，指针指向下一个对象。如果满了，则需要淘汰一个对象。检查指针指向的对象，

- R为1，说明对象在working set中，则重置R为0，指针指向下一个对象。

- R为0。如果age大于t，说明对象不在working set中，则替换该对象，并置R为1，rt为当前时间。如果age不大于t，则继续寻找淘汰对象。如果回到指针开始的位置，还未寻找到淘汰对象，则淘汰遇到的第一个R为0的对象。

# 二次机会法（或者enhanced clock）

改进型的CLOCK算法

思路：减少修改页的缺页处理开销

修改Clock算法，使它允许脏页总是在一次时钟头扫描中保留下来，同时使用脏位（dity bit,也叫写位）和使用位来指导置换

## 算法流程

在之前的CLOCK算法上面除了使用位(used bit)，还增加了一个修改位(modified bit)，有些地方也叫做dirty bit。

现在每一页有两个状态，分别是(使用位，修改位)，可分为以下四种情况考虑：

(0,0)：最近没有使用使用也没有修改，最佳状态！

(0,1)：修改过但最近没有使用，将会被写

(1,0)：使用过但没有被修改，下一轮将再次被用

(1,1)：使用过也修改过，下一轮页面置换最后的选择

## 例子

以下面这个页面置换过程为例：

访问的页面依次是:0,1,3,6,2,4,5,2,5,0,3,1,2,5,4,1,0，其中红色数字表示将要修改的页面，即他们的modified bit将被设置成1，在下图中这些页面用斜体表示，使用位和修改位如下图所示。下面的"Fault ?"表示缺页时查找空闲frame的次数。

![输入图片说明](https://images.gitee.com/uploads/images/2020/1004/100949_37e294d8_508704.png)

### 替换顺序

1. 从指针当前的位置开始寻找主存中满足(使用位，修改位)为(0,0)的页面；

2. 如果第1步没有找到满足条件的，接着寻找状态为(0,1)页面；

3. 如果依然没有找到，指针回到最初的位置，将集合中所有页面的使用位设置成0。重复第1步，并且如果有必要，重复第2步，这样一定可以找到将要替换的页面。

# java 实现 clock 算法


# java 实现 enhanced clock 算法



# LRU、FIFO与Clock的比较

LRU和FIFO本质都是先进先出的思路，但LRU是针对页面的最近访问时间来进行排序，所以需要在每一次页面访问的时候动态的调整各个页面之间的先后顺序（每一个页面的最近访问时间变了）；而FIFO针对页面进入内存的时间来进行排序，这个时间是固定不变的，所以页面之间的先后顺序是固定不变的。

如果程序局部性，则LRU会很好。如果内存中所有页面都没有被访问过会退化为FIFO（如页面进入内存后没有被访问，最近访问时间与进入内存的时间相同）。

LRU算法性能较好，但系统开销较大；FIFO算法的系统的开销较小，但可能发生Belady现象。

因此，择衷的办法就是Clock算法，在每一次页面访问时，它不必去动态调整页面在链表中的顺序，而仅仅是做一个标记，等待发生缺页中断的时候，再把它移动到链表的末尾。

对于内存当中未被访问的页面，Clock算法的表现与LRU一样好，而对于那些曾经访问过的页面，它不能像LRU那样记住它们的准确访问顺序。

# 置换算法补充

常见的置换算法，我们基本已经讲述了一遍了。

不过算法的变种，不同场景的算法也比较多，这里补充没有详解的算法，此处就不做对应的实现了。

目的为了完善整个淘汰算法的认知体系。

## 最佳置换算法(OPT)

最佳(Optimal, OPT)置换算法所选择的被淘汰页面将是以后永不使用的，或者是在最长时间内不再被访问的页面,这样可以保证获得最低的缺页率。

但由于人们目前无法预知进程在内存下的若千页面中哪个是未来最长时间内不再被访问的，因而该算法无法实现。

最佳置换算法可以用来评价其他算法。假定系统为某进程分配了三个物理块，并考虑有以下页面号引用串：

```
7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1
```

进程运行时，先将7, 0, 1三个页面依次装入内存。

进程要访问页面2时，产生缺页中断，根据最佳置换算法，选择第18次访问才需调入的页面7予以淘汰。

然后，访问页面0时，因为已在内存中所以不必产生缺页中断。访问页面3时又会根据最佳置换算法将页面1淘汰……依此类推，如图3-26所示。

从图中可以看出釆用最佳置换算法时的情况。

可以看到，发生缺页中断的次数为9，页面置换的次数为6。

![输入图片说明](https://images.gitee.com/uploads/images/2020/1004/102415_8dff616b_508704.png)

当然这个是理论算法，实际是无法实现的，因为我们无法预知后面的数据会被如何使用。

## 页面缓冲算法(PBA：Page Buffering Algorithm)　

虽然LRU和Clock置换算法都比FIFO算法好，但它们都需要一定的硬件支持，并需付出较多的开销，而且，置换一个已修改的页比置换未修改页的开销要大。

而页面缓冲算法(PBA)则既可改善分页系统的性能，又可采用一种较简单的置换策略。

VAX/VMS操作系统便是使用页面缓冲算法。它采用了前述的可变分配和局部置换方式，置换算法采用的是FIFO。

该算法规定将一个被淘汰的页放入两个链表中的一个，即如果页面未被修改，就将它直接放入空闲链表中；否则，便放入已修改页面的链表中。须注意的是，这时页面在内存中并不做物理上的移动，而只是将页表中的表项移到上述两个链表之一中。

空闲页面链表，实际上是一个空闲物理块链表，其中的每个物理块都是空闲的，因此，可在其中装入程序或数据。当需要读入一个页面时，便可利用空闲物理块链表中的第一个物理块来装入该页。当有一个未被修改的页要换出时，实际上并不将它换出内存，而是把该未被修改的页所在的物理块挂在自由页链表的末尾。

类似地，在置换一个已修改的页面时，也将其所在的物理块挂在修改页面链表的末尾。利用这种方式可使已被修改的页面和未被修改的页面都仍然保留在内存中。当该进程以后再次访问这些页面时，只需花费较小的开销，使这些页面又返回到该进程的驻留集中。当被修改的页面数目达到一定值时，例如64个页面，再将它们一起写回到磁盘上，从而显著地减少了磁盘I/O的操作次数。

一个较简单的页面缓冲算法已在MACH操作系统中实现了，只是它没有区分已修改页面和未修改页面。

## 置换算法对比

| 算法	                | 注释 |
|:---|:---|
| 最优算法	            | 不可实现，但可作为基准 |
| NRU（最近未使用）算法	 |  LRU的粗糙的近似 |
| FIFO算法	            | 可能抛弃重要（常使用）页面 |
| 第二次机会算法	        | 比FIFO有大的改善 |
| 时钟算法	            | 现实的 |
| LRU（最近最少使用）算法 |  很优秀，但难以实现 |
| NFU（最不经常使用）算法 |  LRU的近似 |
| 老化算法	            | 非常近似LRU |
| 工作集算法	            | 实现起来开销很大 |
| 工作集时钟算法	        | 好的有效算法 |

# 小结

clock 算法算是一种权衡，在实际的实践应用中，操作系统选择的就是这种算法。

个人理解clock 的好处就是**不用频繁地每次访问都去更新元素的位置**，只需要淘汰的时候进行一次更新即可，我们在 LRU 中虽然使用双向链表优化，时间复杂度为 O(1)，但是还是比较浪费的。

> 开源地址：[https://github.com/houbb/cache](https://github.com/houbb/cache)

觉得本文对你有帮助的话，欢迎点赞评论收藏关注一波~

你的鼓励，是我最大的动力~

# 拓展阅读

淘汰算法有:

FIFO

LRU

LFU

OPT 算法

SC 二次机会

老化算法

时钟工作集算法

# 参考资料

[操作系统页面置换算法(opt,lru,fifo,clock)实现](https://www.cnblogs.com/hujunzheng/p/4831007.html)

[页面置换算法](https://zhuanlan.zhihu.com/p/47814764)

[页面置换算法-CLOCK置换算法及其改进版算法](https://blog.csdn.net/zhuixun_/article/details/85336417)

[缓存淘汰算法系列(二)](https://www.cnblogs.com/junyuhuang/p/5993612.html)

[simple os book](https://github.com/chyyuu/simple_os_book/blob/master/zh/chapter-3/swap_algors.md)

[为什么PostgreSQL抛弃了LRU算法而使用时钟扫描？](https://cloud.tencent.com/developer/article/1586335)

[改进型Clock置换算法](http://blog.sina.com.cn/s/blog_600a17e90100dad7.html)

[利用python实现OPT、FIFO、LRU、LFU、简单的和改进的CLOCK共六种页面置换算法，并对六种算法的过程和关系进行分析](https://www.geek-share.com/detail/2776079876.html)

* any list
{:toc}