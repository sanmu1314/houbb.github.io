---
layout: post
title:  Netty-08-linux 通讯模型概览
date:  2017-11-16 19:23:06 +0800
categories: [Netty]
tags: [netty, java, io, linux, overview, sh]
published: true
---


# IO模型

linux系统IO分为内核准备数据和将数据从内核拷贝到用户空间两个阶段。

![IO模型](https://images2015.cnblogs.com/blog/831179/201608/831179-20160814120934953-1360584282.png)

从硬盘==》内核空间缓冲区==》用户空间缓冲区

# 基本概念

## 用户空间与内核空间

现在操作系统都是采用虚拟存储器，那么对32位操作系统而言，它的寻址空间（虚拟存储空间）为4G（2的32次方）。

操作系统的核心是内核，独立于普通的应用程序，可以访问受保护的内存空间，也有访问底层硬件设备的所有权限。

为了保证用户进程不能直接操作内核（kernel），保证内核的安全，操作系统将虚拟空间划分为两部分，一部分为内核空间，一部分为用户空间。

针对linux操作系统而言，将最高的1G字节（从虚拟地址0xC0000000到0xFFFFFFFF），供内核使用，称为内核空间，而将较低的3G字节（从虚拟地址0×00000000到0xBFFFFFFF），供各个进程使用，称为用户空间。

如何分配这两个空间的大小也是有讲究的，如windows 32位操作系统，默认的用户空间：内核空间的比例是1:1;

而在32位Linux系统中的默认比例是3:1（3G用户空间，1G内核空间）。

- 划分的目的

为了内核的安全性。

## 进程切换

为了控制进程的执行，内核必须有能力挂起正在CPU上运行的进程，并恢复以前挂起的某个进程的执行。这种行为被称为进程切换。

因此可以说，任何进程都是在操作系统内核的支持下运行的，是与内核紧密相关的。

从一个进程的运行转到另一个进程上运行，这个过程中经过下面这些变化：

- 保存处理机上下文，包括程序计数器和其他寄存器。

- 更新PCB信息。

- 把进程的PCB移入相应的队列，如就绪、在某事件阻塞等队列。 选择另一个进程执行，并更新其PCB。

- 更新内存管理的数据结构。

- 恢复处理机上下文。

## 进程的阻塞

正在执行的进程，由于期待的某些事件未发生，如请求系统资源失败、等待某种操作的完成、新数据尚未到达或无新工作做等，则由系统自动执行阻塞原语(Block)，使自己由运行状态变为阻塞状态。

可见，进程的阻塞是进程自身的一种主动行为，也因此只有处于运行态的进程（获得CPU），才可能将其转为阻塞状态。当进程进入阻塞状态，是不占用CPU资源的。

## 文件描述符

文件描述符（File descriptor）是计算机科学中的一个术语，是一个用于表述指向文件的引用的抽象化概念。

文件描述符在形式上是一个非负整数。实际上，它是一个索引值，指向内核为每一个进程所维护的该进程打开文件的记录表。当程序打开一个现有文件或者创建一个新文件时，内核向进程返回一个文件描述符。在程序设计中，一些涉及底层的程序编写往往会围绕着文件描述符展开。但是文件描述符这一概念往往只适用于UNIX、Linux这样的操作系统。

# 缓存 IO

缓存 IO 又被称作标准 IO，大多数文件系统的默认 IO 操作都是缓存 IO。

在 Linux 的缓存 IO 机制中，操作系统会将 IO 的数据缓存在文件系统的页缓存（ page cache ）中，也就是说，数据会先被拷贝到操作系统内核的缓冲区中，然后才会从操作系统内核的缓冲区拷贝到应用程序的地址空间。

- 缓存 IO 的缺点：

数据在传输过程中需要在应用程序地址空间和内核进行多次数据拷贝操作，这些数据拷贝操作所带来的 CPU 以及内存开销是非常大的。

- 零拷贝

参见 [零拷贝](https://houbb.github.io/2018/09/22/java-nio-09-zero-copy-09)

# 同步与异步 & 阻塞与非阻塞

在进行网络编程时，我们常常见到同步(Sync)/异步(Async)，阻塞(Block)/非阻塞(Unblock)四种调用方式，先理解一些概念性的东西。

## 1. 同步与异步

同步与异步同步和异步关注的是消息通信机制 (synchronous communication/ asynchronous communication)所谓同步，就是在发出一个调用时，在没有得到结果之前，该调用就不返回。但是一旦调用返回，就得到返回值了。换句话说，就是由调用者主动等待这个调用的结果。

而异步则是相反，调用在发出之后，这个调用就直接返回了，所以没有返回结果。换句话说，当一个异步过程调用发出后，调用者不会立刻得到结果。而是在调用发出后，被调用者通过状态、通知来通知调用者，或通过回调函数处理这个调用。

典型的异步编程模型比如 Node.js。

- POSIX 对这两个术语的定义：

同步I/O操作：导致请求进程阻塞，直到I/O操作完成

异步I/O操作：不导致请求进程阻塞

## 2. 阻塞与非阻塞

阻塞和非阻塞关注的是程序在等待调用结果（消息，返回值）时的状态。

阻塞调用是指调用结果返回之前，当前线程会被挂起。调用线程只有在得到结果之后才会返回。非阻塞调用指在不能立刻得到结果之前，该调用不会阻塞当前线程。

# Linux下的五种IO模型

## socket 与 io

网络IO的本质就是socket的读取，socket在linux系统被抽象为流，IO可以理解为对流的操作。

文章开始的时候也提到了，对于一次IO访问（以read为例），数据会先被拷贝到操作系统内核的缓冲区，然后才会从操作系统内核的缓冲区拷贝到应用程序的地址空间中。所以说，当一个read操作发生时，它会经历两个阶段：

第一个阶段：等待数据准备。

第二个阶段：将数据从内核拷贝到进程中

对于socket流而言：

第一步：通常涉及等待网络上的数据分组到达，然后复制到内核的某个缓冲区。

第二步：把数据从内核缓冲区复制到应用进程缓冲区。

当然，如果内核空间的缓冲区中已经有数据了，那么就可以省略第一步。至于为什么不能直接让磁盘控制器把数据送到应用程序的地址空间中呢？

最简单的一个原因就是应用程序不能直接操作底层硬件。

网络应用需要处理的无非就是两大类问题，网络IO，数据计算。相对于后者，网络IO的延迟，给应用带来的性能瓶颈大于后者。

## io 模型

阻塞IO（blocking IO）

非阻塞IO （nonblocking IO）

IO复用(select 和poll) （IO multiplexing）

信号驱动IO （signal driven IO (SIGIO)）

异步IO （asynchronous IO (the POSIX aio_functions)）

前四种都是同步，只有最后一种才是异步IO。

## 阻塞IO模型

在这个模型中，应用程序（application）为了执行这个read操作，会调用相应的一个system call，将系统控制权交给kernel，然后就进行等待（这其实就是被阻塞了）。

kernel开始执行这个system call，执行完毕后会向应用程序返回响应，应用程序得到响应后，就不再阻塞，并进行后面的工作。

- 优点：

能够及时返回数据，无延迟。

- 缺点：

对用户来说处于等待就要付出性能代价。

## 非阻塞IO

在linux下，应用程序可以通过设置文件描述符的属性O_NONBLOCK，IO操作可以立即返回，但是并不保证IO操作成功。

也就是说，当应用程序设置了O_NONBLOCK之后，执行write操作，调用相应的system call，这个system call会从内核中立即返回。

但是在这个返回的时间点，数据可能还没有被真正的写入到指定的地方。

也就是说，kernel只是很快的返回了这个 system call（只有立马返回，应用程序才不会被这个IO操作blocking），但是这个system call具体要执行的事情（写数据）可能并没有完成。而对于应用程序，虽然这个IO操作很快就返回了，但是它并不知道这个IO操作是否真的成功了，为了知道IO操作是否成功，一般有两种策略：一是需要应用程序主动地循环地去问kernel(这种方法就是同步非阻塞IO)；二是采用IO通知机制，比如：IO多路复用(这种方法属于异步阻塞IO)或信号驱动IO(这种方法属于异步非阻塞IO)。

- 优点：

能够在等待的时间里去做其他的事情。

- 缺点：

任务完成的响应延迟增大了，因为每过一段时间去轮询一次read操作，而任务可能在两次轮询之间的任意时间完成，这对导致整体数据吞吐量的降低。

## IO多路复用

和之前一样，应用程序要执行read操作，因此调用一个system call，这个system call被传递给了kernel。

但在应用程序这边，它调用system call之后，并不等待kernel的返回结果而是立即返回，虽然立即返回的调用函数是一个异步的方式，但应用程序会被像select()、poll和epoll等具有复用多个文件描述符的函数阻塞住，一直等到这个system call有结果返回了，再通知应用程序。

也就是说，“在这种模型中，IO函数是非阻塞的，使用阻塞 select、poll、epoll系统调用来确定一个 或多个IO 描述符何时能操作。”

所以，从IO操作的实际效果来看，异步阻塞IO和第一种同步阻塞IO是一样的，应用程序都是一直等到IO操作成功之后（数据已经被写入或者读取），才开始进行下面的工作。

不同点在于异步阻塞IO用一个select函数可以为多个描述符提供通知，提高了并发性。

举个例子：假如有一万个并发的read请求，但是网络上仍然没有数据，此时这一万个read会同时各自阻塞，现在用select、poll、epoll这样的函数来专门负责阻塞同时监听这一万个请求的状态，一旦有数据到达了就负责通知，这样就将之前一万个的各自为战的等待与阻塞转为一个专门的函数来负责与管理。

与此同时，异步阻塞IO和第二种同步非阻塞IO的区别在于：同步非阻塞IO是需要应用程序主动地循环去询问是否有操作数据可操作，而异步阻塞IO是通过像select和poll等这样的IO多路复用函数来同时检测多个事件句柄来告知应用程序是否可以有数据操作。

了解了前面三种IO模式，在用户进程进行系统调用的时候，他们在等待数据到来的时候，处理的方式是不一样的，直接等待、轮询、select或poll轮询，两个阶段过程：

第一个阶段有的阻塞，有的不阻塞，有的可以阻塞又可以不阻塞。

第二个阶段都是阻塞的。

从整个IO过程来看，他们都是顺序执行的，因此可以归为同步模型，都是进程自动等待且向内核检查状态。

高并发的程序一般使用同步非阻塞模式，而不是多线程+同步阻塞模式。

要理解这点，先弄明白并发和并行的区别：比如去某部门办事需要依次去几个窗口，办事大厅的人数就是并发数，而窗口的个数就是并行度。就是说并发是同时进行的任务数（如同时服务的http请求），而并行数就是可以同时工作的物理资源数量（如cpu核数）。通过合理调度任务的不同阶段，并发数可以远远大于并行度。这就是区区几个CPU可以支撑上万个用户并发请求的原因。在这种高并发的情况下，为每个用户请求创建一个进程或者线程的开销非常大。而同步非阻塞方式可以把多个IO请求丢到后台去，这样一个CPU就可以服务大量的并发IO请求。

IO多路复用究竟是同步阻塞还是异步阻塞模型，这里来展开说说：

同步是需要主动等待消息通知，而异步则是被动接受消息通知，通过回调、通知、状态等方式来被动获取消息。

IO多路复用在阻塞到select阶段时，用户进程是主动等待并调用select函数来获取就绪状态消息，并且其进程状态为阻塞。所以IO多路复用是同步阻塞模式。


## 信号驱动IO （signal driven IO (SIGIO)）

应用程序提交read请求的system call，然后，kernel开始处理相应的IO操作，而同时，应用程序并不等kernel返回响应，就会开始执行其他的处理操作（应用程序没有被IO操作所阻塞）。当kernel执行完毕，返回read的响应，就会产生一个信号或执行一个基于线程的回调函数来完成这次 IO 处理过程。

从理论上说，阻塞IO、IO复用和信号驱动的IO都是同步IO模型。

因为在这三种模型中，IO的读写操作都是在IO事件发生之后由应用程序来完成。

而POSIX规范所定义的异步IO模型则不同。对异步IO而言，用户可以直接对IO执行读写操作，这些操作告诉内核用户读写缓冲区的位置，以及IO操作完成后内核通知应用程序的方式。

异步IO读写操作总是立即返回，而不论IO是否阻塞的，因为真主的读写操作已经由内核接管。也就是说，同步IO模型要求用户代码自行执行IO操作(将数据从内核缓冲区读入用户缓冲区，或将数据从用户缓冲区写入内核缓冲区)，而异步IO机制则是由内核来执行IO操作(数据在内核缓冲区和用户缓冲区之间的移动是由内核在后台完成的)。

你可以这样认为，同步IO向应用程序通知的是IO就绪事件，而异步IO向应用程序通知的是IO完成事件。

linux环境下，aio.h头文件中定义的函数提供了对异步IO的支持。

## 异步IO （asynchronous IO (the POSIX aio_functions)）

异步IO与上面的异步概念是一样的， 当一个异步过程调用发出后，调用者不能立刻得到结果，实际处理这个调用的函数在完成后，通过状态、通知和回调来通知调用者的输入输出操作。

异步IO的工作机制是：告知内核启动某个操作，并让内核在整个操作完成后通知我们，这种模型与信号驱动的IO区别在于，信号驱动IO是由内核通知我们何时可以启动一个IO操作，这个IO操作由用户自定义的信号函数来实现，而异步IO模型是由内核告知我们IO操作何时完成。为了实现异步IO，专门定义了一套以aio开头的API，如：aio_read.

小结：前四种模型–阻塞IO、非阻塞IO、多路复用IO和信号驱动IO都属于同步模式，因为其中真正的IO操作(函数)都将会阻塞进程，只有异步IO模型真正实现了IO操作的异步性。

# 拓展阅读

[select](https://houbb.github.io/2017/11/16/netty-08-module-linux-01-select-01)

[poll](https://houbb.github.io/2017/11/16/netty-08-module-linux-02-poll-02)

[epoll](https://houbb.github.io/2017/11/16/netty-08-module-linux-03-epoll-03)

# 参考资料

[Linux下五种网络IO模型详解](https://segmentfault.com/p/1210000010123107/read)

[Linux 下的五种 IO 模型详细介绍](https://www.jb51.net/article/94783.htm)

[深入理解JAVA I/O系列六：Linux中的IO模型](https://www.cnblogs.com/dongguacai/p/5770287.html)

[Linux五种IO模型](https://www.cnblogs.com/renxs/p/3683189.html)

* any list
{:toc}
