namespace ECMAScript {
  export type HostDefined<T = any> = T;
  export type Implements<T> = Object & Partial<T>;

  export interface Record<T = any> {
    [name: string]: T;
  }

  export interface List<T = any> {
    [index: number]: T;
  }

  export interface ParseNode<K extends string = string> {
    '[[Kind]]': K;
  }

  /** @see https://tc39.github.io/ecma262/#sec-environment-records */
  export interface EnvironmentRecord {
    /**
     * Determine if an Environment Record has a binding for the String value N.
     * @return {boolean} true if it does and false if it does not.
     */
    HasBinding(N: string): boolean;

    /**
     * Create a new but uninitialized mutable binding in an Environment Record.
     * The String value N is the text of the bound name. If the Boolean
     * argument D is true the binding may be subsequently deleted.
     */
    CreateMutableBinding(N: string, D: boolean): void;

    /**
     * Create a new but uninitialized immutable binding in an Environment
     * Record. The String value N is the text of the bound name. If S is true
     * then attempts to set it after it has been initialized will always throw
     * an exception, regardless of the strict mode setting of operations that
     * reference that binding.
     */
    CreateImmutableBinding(N: string, S: boolean): void;

    /**
     * Set the value of an already existing but uninitialized binding in an
     * Environment Record. The String value N is the text of the bound name. V
     * is the value for the binding and is a value of any ECMAScript language
     * type.
     */
    InitializeBinding<T>(N: string, V: T): void;

    /**
     * Set the value of an already existing mutable binding in an Environment
     * Record. The String value N is the text of the bound name. V is the value
     * for the binding and may be a value of any ECMAScript language type. S is
     * a Boolean flag. If S is true and the binding cannot be set throw a
     * TypeError exception.
     */
    SetMutableBinding<T>(N: string, V: T, S: boolean): void;

    /**
     * Returns the value of an already existing binding from an Environment
     * Record. The String value N is the text of the bound name. S is used to
     * identify references originating in strict mode code or that otherwise
     * require strict mode reference semantics. If S is true and the binding
     * does not exist throw a ReferenceError exception. If the binding exists
     * but is uninitialized a ReferenceError is thrown, regardless of the value
     * of S.
     */
    GetBindingValue<T>(N: string, S: boolean): T;

    /**
     * Delete a binding from an Environment Record. The String value N is the
     * text of the bound name. If a binding for N exists, remove the binding
     * and return true. If the binding exists but cannot be removed return
     * false. If the binding does not exist return true.
     */
    DeleteBinding(N: string): boolean;

    /**
     * Determine if an Environment Record establishes a this binding. Return
     * true if it does and false if it does not.
     */
    HasThisBinding(): boolean;

    /**
     * Determine if an Environment Record establishes a super method binding.
     * @return {boolean} true if it does and false if it does not.
     */
    HasSuperBinding(): boolean;

    /**
     * If this Environment Record is associated with a with statement, return
     * the with object. Otherwise, return undefined.
     */
    WithBaseObject(): object | undefined;
  }

  /** @see https://tc39.github.io/ecma262/#realm-record */
  export interface RealmRecord {
    /** The intrinsic values used by code associated with this realm */
    '[[Intrinsics]]': Record;

    /** The global object for this realm */
    '[[GlobalObject]]': Object;

    /** The global environment for this realm*/
    '[[GlobalEnv]]': LexicalEnvironment;

    /**
     * Template objects are canonicalized separately for each realm using
     * its Realm Record's [[TemplateMap]]. Each [[Site]] value is a Parse Node
     * that is a TemplateLiteral. The associated [[Array]] value is the
     * corresponding template object that is passed to a tag function.
     *
     * NOTE
     * Once a Parse Node becomes unreachable, the corresponding [[Array]] is
     * also unreachable, and it would be unobservable if an implementation
     * removed the pair from the [[TemplateMap]] list.
     */
    '[[TemplateMap]]': List<
      Record<{
        '[[Site]]': ParseNode<'TemplateLiteral'>;
        '[[Array]]': Implements<TemplateStringsArray>;
      }>
    >;

    /** Any, default value is undefined.	Field reserved for use by host environments that need to associate additional information with a Realm Record.*/
    '[[HostDefined]]': any;
  }

  /** @see https://tc39.github.io/ecma262/#sec-lexical-environments */
  export interface LexicalEnvironment extends EnvironmentRecord {}

  /** @see https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects */
  export interface ModuleNamespace {
    /** The Module Record whose exports this namespace exposes. */
    '[[Module]]': ModuleRecord<this>;

    /**
     * A List containing the String values of the exported names exposed as
     * own properties of this object. The list is ordered as if an Array of
     * those String values had been sorted using Array.prototype.sort using
     * undefined as comparefn.
     */
    '[[Exports]]': List<string>;

    /** This slot always contains the value null. */
    '[[Prototype]]': null;
  }

  export interface ModuleRecord<
    N extends ModuleNamespace = undefined,
    R extends RealmRecord = RealmRecord,
    E extends LexicalEnvironment = undefined,
    V extends HostDefined = undefined
  > {
    /** The Realm within which this module was created. undefined if not yet assigned. */
    '[[Realm]]': R;

    /** The Lexical Environment containing the top level bindings for this module. This field is set when the module is instantiated. */
    '[[Environment]]': E;

    /** */
    '[[Namespace]]': N;

    /** Field reserved for use by host environments that need to associate additional information with a module. */
    '[[HostDefined]]': V;
  }
}

export default ECMAScript;
