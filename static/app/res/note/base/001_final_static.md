# final




使用 final 关键字修饰一个变量时,是【指引用变量不能变】,引用变量所指向的对象中的内容
还是可以改变的。例如,对于如下语句:
final StringBuffer a=new StringBuffer("immutable");
执行如下语句将报告编译期错误:
a=new StringBuffer("");
但是,执行如下语句则可以通过编译:
a.append(" broken!");
有人在定义方法的参数时,可能想采用如下形式来阻止方法内部修改传进来的参数对象:
public void method(final StringBuffer param){
} 实际上,这是办不到的,在该方法内部仍然可以增加如下代码来修改参数对象:
param.append("a");





1、final类

final类不能被继承，因此final类的成员方法没有机会被覆盖，默认都是final的。在设计类时候，如果这个类不需要有子类，类的实现细节不允许改变，

并且确信这个类不会载被扩展，那么就设计为final类。


2、final方法

如果一个类不允许其子类覆盖某个方法，则可以把这个方法声明为final方法。
使用final方法的原因有二：

1) 把方法锁定，防止任何继承类修改它的意义和实现。

2) 高效。编译器在遇到调用final方法时候会转入内嵌机制，大大提高执行效率。


3、final变量（常量）
用final修饰的成员变量表示常量，值一旦给定就无法改变！
final修饰的变量有三种：静态变量、实例变量和局部变量，分别表示三种类型的常量。
从下面的例子中可以看出，一旦给final变量初值后，值就不能再改变了。
另外，final变量定义的时候，可以先声明，而不给初值，这中变量也称为final空白，无论什么情况，
编译器都确保空白final在使用之前必须被初始化。但是，final空白在final关键字final的使用上提供了更大的灵活性，
为此，一个类中的final数据成员就可以实现依对象而有所不同，却有保持其恒定不变的特征。



4、final参数

当函数参数为final类型时，你可以读取使用该参数，但是无法改变该参数的值。


声明为final 并不代表不可以改变 比如 final 的数组, 其中的内容依然可以被修改。



一共是4种, 希望可以结合自己平时的使用, 简单分析下。



【
比如 会提及到 String

就会提到 StringBuilder StringBuffer 就会提及到线程安全

这系一列是比较基础的知识。

】




# static

1) static 所有实例共享同一个副本

2) static 代码块 中 会在 （JVM）加载类时，就会执行该代码块

3) 静态方法(和属性一样)不依赖于对象, 而是隶属于类。一般工具类。






static表示“全局”或者“静态”的意思，用来修饰成员变量和成员方法，也可以形成静态static代码块，但是Java语言中没有全局变量的概念。


用public修饰的static成员变量和成员方法本质是全局变量和全局方法，当声明它类的对象市，不生成static变量的副本，而是类的所有实例共享同一个static变量。

static变量前可以有private修饰，表示这个变量可以在类的静态代码块中，或者类的其他静态成员方法中使用（当然也可以在非静态成员方法中使用--废话），但是不能在其他类中通过类名来直接引用，这一点很重要。
实际上你需要搞明白，private是访问权限限定，static表示不要实例化就可以使用，这样就容易理解多了。static前面加上其它访问权限关键字的效果也以此类推。

static修饰的成员变量和成员方法习惯上称为静态变量和静态方法，可以直接通过类名来访问，访问语法为：

类名.静态方法名(参数列表...)
类名.静态变量名

用static修饰的代码块表示静态代码块，当Java虚拟机（JVM）加载类时，就会执行该代码块（用处非常大，呵呵）。


1、static变量
        按照是否静态的对类成员变量进行分类可分两种：一种是被static修饰的变量，叫静态变量或类变量；另一种是没有被static修饰的变量，叫实例变量。两者的区别是：
        对于静态变量在内存中只有一个拷贝（节省内存），JVM只为静态分配一次内存，在加载类的过程中完成静态变量的内存分配，可用类名直接访问（方便），当然也可以通过对象来访问（但是这是不推荐的）。
        对于实例变量，没创建一个实例，就会为实例变量分配一次内存，实例变量可以在内存中有多个拷贝，互不影响（灵活）。

2、静态方法
        静态方法可以直接通过类名调用，任何的实例也都可以调用，因此静态方法中不能用this和super关键字，不能直接访问所属类的实例变量和实例方法(就是不带static的成员变量和成员成员方法)，只能访问所属类的静态成员变量和成员方法。因为实例成员与特定的对象关联！
        因为static方法独立于任何实例，因此static方法必须被实现，而不能是抽象的abstract。

3、static代码块
        static代码块也叫静态代码块，是在类中独立于类成员的static语句块，可以有多个，位置可以随便放，它不在任何的方法体内，JVM加载类时会执行这些静态的代码块，如果static代码块有多个，JVM将按照它们在类中出现的先后顺序依次执行它们，每个代码块只会被执行一次。

4、static和final一块用表示什么
        static final用来修饰成员变量和成员方法，可简单理解为“全局常量”！
        对于变量，表示一旦给值就不可修改，并且通过类名可以访问。
        对于方法，表示不可覆盖，并且可以通过类名直接访问。

特别要注意一个问题：
对于被static和final修饰过的实例常量，实例本身不能再改变了，但对于一些容器类型（比如，ArrayList、HashMap）的实例变量，不可以改变容器变量本身，但可以修改容器中存放的对象，这一点在编程中用到很多。




# 二者的结合使用

被static修饰的成员变量和成员方法独立于该类的任何对象。(只隶属于某一个类)

也就是说，它不依赖类特定的实例，被类的所有实例共享。只要这个类被加载，Java虚拟机就能根据类名在运行时数据区的方法区内定找到他们。因此，static对象可以在它的任何对象创建之前访问，无需引用任何对象。




