---
layout: post
title:  JVM-13-runtime optimize
date:  2018-10-08 23:36:46 +0800
categories: [JVM]
tags: [java, log, jvm, sf]
published: true
excerpt: JVM 运行时期优化
---

# 概述

## JIT

即时编译器（JIT=just in time compiler）定义：为了提高热点代码的执行效率，在运行时，虚拟机将把这些代码编译成与 本地平台相关的机器码，并进行各种层次的优化，完成这个任务的编译器称为即时编译器；

事实上，现在许多主流的商用虚拟机，都同时包含有解释器与编译器，解释器与编译器两者各有优势。与解释器相比，编译器会将常运行到的代码编译成本地代码区实现，可以获取更高的执行效率。而当程序运行环境中内存资源限制较大时，可以使用解释执行节约内存，反之可以使用编译执行来提高效率。解释器和编译器之间还可以通过逆优化退回到解释状态继续执行，因此，在整个虚拟机执行架构中，解释器与编译器经常配合工作。 

HotSpot编译器中出现两个编译器Client Compiler称为C1编译器，Server Compiler称为C2编译器。JVM默认采用解释器与其中一个编译器直接配合的方法工作，程序使用哪个编译器，取决于虚拟机运行的模式，HotSpot虚拟机会根据自身版本与宿主机器的硬件性能自动选择运行模式，用户也可以使用“-client”或“server”参数去强制指定虚拟机运行在Client模式还是Server模式。 

### 混合模式

解释器与编译器搭配使用的方式在虚拟机中称为“混合模式”，用户可以使用参数”-Xint”强制虚拟机运行于解释模式，也可以使用“-Xcomp”强制虚拟机运行于编译模式。 

混合模式：解释器和编译器搭配使用的方式在虚拟机中叫做 混合模式；

- 解释模式：使用参数 -Xint 强制虚拟机运行在解释模式， 这时编译器完全不介入工作；

- 编译模式：使用参数 -Xcomp 强制虚拟机运行在编译模式， 这时将优先采用编译方式执行程序，但解释器仍然要求在编译无法进行的情况下介入执行过程；

- 通过虚拟机的 -version 命令的输出结果显示出这3种模式：

```
java version "1.8.0_91"
Java(TM) SE Runtime Environment (build 1.8.0_91-b14)
Java HotSpot(TM) 64-Bit Server VM (build 25.91-b14, mixed mode)
```


### 分层编译

为了在程序启动响应速度与运行效率之间达到最佳平衡，HotSpot虚拟机还会逐渐启动分层编译的策略，分层编译的概念在JDK1.6中出现，后来一直处于改进阶段，最终在JDK1.7的Server模式虚拟机中作为umoren编译策略被开启。分层编译根据编译器编译、优化的规模与耗时，划分出不同的编译层次，其中包括：

第0层，程序解释执行，解释器不开启性能监控功能，可触发第1层编译。
第1层，也成为C1编译，将字节码编译为本地代码，进行简单、可靠的优化，如有必要时将加入性能监控的逻辑。
第2层（或2层以上）：也成为C2编译，也是将字节码编译为本地代码，但是会启动一些编译耗时较长的优化，甚至会根据性能监控信息进行一些不可靠的激进优化。 
事实上，用Client Compiler获取更高的编译速度，用Server Compiler来获取更好的编译质量，在解释执行的时候也无须再承担收集性能监控信息的任务。

## 热点代码

当虚拟机发现某个方法或代码块运行特别频繁，就会把这些代码认定为热点代码；

本文提及的编译器，即时编译器都是指 HotSpot 虚拟机内的即时编译器，虚拟机也是特指HotSpot虚拟机；


## HotSpot 虚拟机内的即时编译器

我们需要解决以下问题：

- 为何HotSpot虚拟机要使用解释器与编译器并存的架构？

- 为何HotSpot虚拟机要实现两个不同的即时编译器？

- 程序何时使用解释器执行？何时使用编译器执行？

- 哪些程序代码会被编译为本地代码？ 如何编译为本地代码？

- 如何从外部观察即时编译器的编译过程和编译结果？

# 编译对象与触发条件

## 编译对象

在运行过程中会被即时编译器编译的“热点代码”有两类： 

1、被多次调用的方法； 

2、被多次执行的循环体。 

对于第一种情况，由于是由方法调用触发的编译，因此编译器会以整个方法作为编译对象，这种编译也是虚拟机中标准的JIT编译方式。

而对第二种情况，尽管编译动作是由循环体所触发的，但编译器依然会以整个方法作为编译对象，这种编译方式因为编译发生在方法执行过程之中，因此形象地被称为栈上替换，简称为OSR编译，即方法栈帧还在栈上，方法就被替换了。

## 触发条件

在这里提一个问题，被多次调用，在这里的多次具体是多少次？并且虚拟机如何统计一个方法或一段代码被执行过多少次？ 

判断一段代码是不是为热点代码，是不是需要触发即时编译，这样的行为称为热点探测，但进行热点探测也是不一定要知道方法具体被调用了多少次，目前主要的热点探　　测判定方法有两种：

### 基于采样的热点探测

虚拟机会周期性地检查各种线程的栈顶，如果发现某个或者某些方法经常出现在栈顶，那这个方法就是“热点方法”。 

优点：实现简单、高效，还可以很容易地获取方法调用方法。 
缺点：很难精确地确认一个方法的热度，容易因为受到线程阻塞或别的外界因素的影响而扰乱热点探测。

### 基于计数器的热点探测

虚拟机会为每个方法尽力计数器，统计方法的执行次数，如果执行次数超过一定的阙值就认为它是热点方法。 

优点：统计结构相对来说更加精确与严谨。 
缺点：实现起来麻烦，需要为每个方法及建立并维护计数器，而且不能直接获取到方法的调用关系。 

在HotSpot中使用的是第二种方法，基于计数器的热点探测法，因此它为每个方法准备了两类计数器：方法调用计数器和汇编计数器（统计一个方法中循环体代码执行的次数，在字节码中中遇到控制流向后跳转的指令称为“回边”。建立回边计数器的目的是为了触发OSR编译。）。

### 方法调用计数器（统计方法被调用次数）

这个计数器就用于统计方法被调用的次数，他的默认阈值在 Client模式下是1500次，在 Server模式下是10000次，可以通过 虚拟机参数 -XX: CompileThreshold 来认为设定

JIT编译的交互过程：

A1）当一个方法被调用时，会先检查该方法是否存在被JIT 编译过的版本：如果存在，则优先使用编译后的本地代码来执行。如果不存在已被编译过的版本，则将此方法的调用计数器值加1，然后判断方法调用计数器与回边计数器值之和是否超过方法计数器的阈值。若超过了，则将会向即时编译器提交一个该方法的代码编译请求；

A2）如果不做任何设置：执行引擎并不会同步等待编译请求完成，而是继续进入解释器按照解释方式执行字节码，直到提交的请求被编译器编译完成。当编译工作完成之后，这个方法的调用入口地址就会被系统自动改写成新的，下一次调用该方法时就会使用已变异的版本，整个JIT 编译的交互过程如下图所示：

![JIT编译的交互过程](https://img-blog.csdn.net/20160403083728456)

### 回边计数器（统计方法循环体代码执行次数）

统计一个方法中循环体代码执行的次数，在字节码中遇到控制流向后跳转的指令称为”回边“；

显然，建立回边计数器统计的目的是为了触发OSR 编译（==栈上替换编译）；

设置参数 `-XX:OnStackReplacePercentage` 来简介调整回边计数器的阈值，回边计数器的阈值的计算公式如下：

1. 虚拟机运行在Client模式下：阈值=方法调用计数器阈值*OSR比率/100；

2. 虚拟机运行在Server模式下：阈值=方法调用计数器阈值*（OSR比率-解释器监控比率）/100；

### 回边计数器触发即时编译的过程

当解释器遇到一条回边指令时，会先查找将要执行的代码片段是否有已经编译好的version，如果有，他将会优先执行已编译的代码，否则就把回边计数器的值加1，然后判断方法调用计数器与回边计数器之和是否超过回边计数器的阈值。

当超过阈值的时候，将会提交一个OSR编译请求，并且把回边计数器的值降低一些，以便继续在解释器中执行循环，等待编译器输出编译结果，整个执行过程如下图所示：

![回边计数器触发即时编译的过程](https://img-blog.csdn.net/20160403083755238)



# 编译过程：

在默认设置下，无论是方法调用产生即使编译请求，还是OSR编译请求，虚拟机在代码编译器还未完成之前，都仍然将按照解释方式继续执行，而编译动作则在后台的编译线程中进行。 
在后台执行编译的过程中，编译器做了什么？Server Compiler和Client Compiler两个编译器的编译过程是不同的，对于Client Compiler来说，它是一个简单快速的三段式编译器，主要的关注点在于局部性的优化，而 放弃了许多耗时较长的全局优化手段。 

1、一个平台独立前段将字节码构造成一种高级中间代码表示（HIR），HIR使用 静态单分配的形式来表示代码值，这可以使得一些在JIR的构造过程之中和之后进行的优化动作更容易实现。在此之前，编译器会在字节码上完成一部分基础优化，如方法内联、常量传播等。 

2、一个平台相关的后端从HIR中产生低级中间代码表示，而在此之前，在HIR上完成另外一些优化， 如空值检查消除、范围检查消除等。 

3、在平台的后端使用线性扫描算法在LIR上分配寄存器，并在LIR上做窥孔优化，然后产生机器代码。

对于Server Compiler则是专门面向服务端的典型应用并为服务端的性能配置特别调整过的编译期，也是一个充分优化过的高级编译器，它会执行所有经典的优化动作。 

Server Compiler的寄存器分配器是一个全局图着色分配器，它可以充分利用某些处理器架构上的大寄存器集合。

所以它也是比较缓慢的，但是编译代码质量高，可以减少本地代码的执行时间，从而抵消了额外的编译时间开销，所以很多非服务端的应用选择使用server模式的虚拟机运行。

# 编译优化技术

java程序员有一个共识：以编译方式执行本地代码比解释方式更快，之所以有这样的共识，除去虚拟机解释执行字节码时额外消耗时间的原因外，
还有一个重要的原因是**虚拟机设计团队几乎把对代码的所有优化措施都集中在了即时编译器中。**

所以编译器产生的本地代码会比Javac 产生的字节码更加优秀；

## 常见优化技术

虚拟机中的具有代表性的优化技术： 

语言无关的经典优化技术之一：公共子表达式消除。 
语言相关的经典优化技术之一：数组范围检查消除。 
最重要的优化技术之一：方法内联 
最前沿的优化技术之一：逃逸分析

## 公共子表达式消除 

如果一个表达式E已经计算过了，并且从先前的计算到现在E中所有变量的值都没有发生变化，那E的这次出现就成公共子表达式，可以用原先的表达式进行消除。

## 数组边界检查消除 

如果编译器只要通过数据流分析就可以判定循环变量的取值范围永远在区间 `[0,length]` 内，那在整个循环中就可以吧数组的上下界检查消除；

隐式异常处理：Java中空指针和算术运算中除数为零的检查。

此外还有：自动装箱消除、安全点消除、消除反射等等。


## 方法内联 

把目标方法的代码“复制”到发起调用的方法之中，避免发生真实的方法调用。

### 无法内联

如果不是即时编译器做了一些特别的努力，按照经典编译原理的优化理论，大多数的java方法都无法进行内联；

- 无法内联的原因

只有使用 invokespecial 指令调用的私有方法， 实例构造器，父类方法以及使用invokestaitc指令进行调用的静态方法才是在编译期进行解析的，除了上述4种方法外，其他的java方法调用都需要在运行时进行方法接收者的多态选择，并且都有可能存在多于一个版本的方法接收者；简而言之，java语言中默认的实例方法是虚方法；

- 对于一个虚方法

编译期做内联的时候根本无法确定应该使用哪个方法版本；

非虚方法：只要能被invokestatic 和 invokespecial 指令调用的方法，都可以在解析阶段中确定唯一的调用版本，符合这个条件的有静态方法，私有方法，实例构造器，父类方法4类，他们在类加载的时候就会把符号引用解析为对该方法的直接引用。这些方法称为非虚方法；

虚方法：其他的方法称为虚方法（除去final方法）；

### 解决虚方法的内联问题

![解决虚方法的内联问题](https://img-blog.csdn.net/20160403084426068)

对上图的分析（Analysis）：

1、CHA==类型继承关系分析（Class Hierarchy Analysis, CHA）：这是一种基于整个应用程序的类型分析技术，它用于确定在目前已经加载的类中，某个接口是否有多于一种的实现，某个类是否存在子类，子类是否为抽象类等信息；

2、方法内联（Inline Cache）：工作原理是，在未发生方法调用之前，内联缓存状态为空，当第一次调用发生后，缓存记录下方法接收者的版本信息，并且每次进行方法调用时都比较接收者版本，如果以后进来的每次调用的方法接收者版本都是一样的，那这个内联还可以一直用下去。如果发生了方法接收者不一致的 case， 就说明程序真正使用了虚方法的多态特性，这时才会取消内联，查找虚方法表进行方法分派；



## 逃逸分析 

分析对象的动态作用域，当一个对象在方法中被定义后，它可能被外部方法所引用，例如作为调用参数传递给其他方法，称为方法逃逸。甚至还有可能被外部线程访问到，比如赋值给类变量或可以在其他线程中访问到的实例变量，称为线程逃逸。 

### 优化方案

如果能证明一个对象不会逃逸到方法或线程之外，也就是别的方法或线程无法通过任何途径访问到这个对象，就可以为这个变量进行一些高效的优化：如：栈上分配、同步消除、标量替换等。

- 栈上分配

如果确定一个对象不会逃逸出方法之外，那让这个对象在栈上分配内存将是一个不错的主意，对象所占用的内存空间就可以随栈帧出栈而销毁；

- 同步消除

线程同步本身是一个相对耗时的过程，如果逃逸分析能够确定一个变量不会逃逸出线程，那这个变量的读写肯定不会有竞争，对这个变量实施的同步措施就可以消除掉；

- 标量替换

1、标量定义：它是指一个数据已经无法再分解成更小的数据来表示了，java虚拟机中的原始数据类型都不能再进一步分解，他们就可以成为标量；

2、聚合量定义：如果一个数据可以继续分解，它被称为聚合量；

3、标量替换：如果把一个java对象拆散，根据程序访问的情况，将其使用到的成员变量恢复原始类型来访问就叫做标量替换；那程序真正执行的时候，将可能不创建这个对象，而改为直接创建它的若干个被这个方法使用到的成员变量来代替。

# java 与 C/C++ 的编译器对比（Comparison）

java虚拟机的即时编译器与C/C++ 的静态优化编译器相比，会由于以下原因而导致输出的本地代码有一些劣势：

1、因为即时编译器运行占用的是用户程序的运行时间：具有很大的时间压力，它能提供的优化手段严重受制于编译成本； 

2、java语言是动态的类型安全语言：这就意味着需要由虚拟机来确保程序不会违反语言语义后访问非结构化内存。从实现层面上来看，这就意味着虚拟机必须频繁地进行动态检查，如实例方法访问时检查空指针，数组元素访问时检查上下界访问，类型转换时检查基础关系等。总体上仍然要消耗不少的时间；

3、java语言中没有virtual关键字，但使用虚方法的频率却远远大于 C 或 C++：这意味着运行时对方法接收者进行多态选择的频率要远远大于C或C++，也意味着 即时编译器在进行一些优化时的难度要远远大于C 或 C++ 的静态优化编译器；

4、java语言是可以动态扩展的语言，运行时加载新的类可能改变程序类型的继承关系： 这使得很多全局的优化都难以进行，因为编译器无法看见程序的全貌，许多全局的优化措施都只能以激进优化的方式来完成，编译器不得不时刻注意并随着类型的变化而在运行时撤销或重新进行一些优化；

5、java语言中对象的内存分配都是在堆上进行的：只有方法中的局部变量才能在栈上分配；而C 或 C++的对象则有多种内存分配方式，既可能在堆上分配，也可能在栈上分配，如果可以在栈上分配线程私有的对象，将减轻内存回收的压力；另外，C或C++中主要由用户程序代码来回收分配的内存，这就不存在无用对象筛选的过程，因此在效率上，也比垃圾收集机制要高；

## 总结

以上java的劣势并不是说 java 不如 C或C++了

1、java 语言上的这些性能上的劣势都是为了换取开发效率上的优势而付出的代价；动态安全，动态扩展，垃圾回收这些拖后腿的特性都为 java 的开发效率做出了贡献；

2、许多优化时 Java的即时编译器能做而C 或 C++的静态优化编译器不能做或做的不好的；

3、java编译器另外一个红利是由它的动态性带来的： 由于C或C++编译器所有优化都在编译器完成，以运行期性能监控为基础的优化措施它都无法进行；

# 参考资料

《深入理解 jvm》

[jvm(11)-晚期（运行期）优化](https://blog.csdn.net/PacosonSWJTU/article/details/51045611)

[JVM总结（六）：晚期（运行期）优化](https://www.cnblogs.com/zhouyuqin/p/5224573.html)

* any list
{:toc}