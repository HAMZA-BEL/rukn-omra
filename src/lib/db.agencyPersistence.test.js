import { fromAgencyRow, getSupabaseErrorReport, toAgencyRow } from "./db";

const editableAgency={
  nameAr:"وكالة عربية",agencyNameLatin:"Latin Agency",city:"Tiznit",ice:"ICE-1",rc:"RC-1",
  email:"agency@example.test",website:"agency.test",phoneTiznit1:"0501",phoneTiznit2:"0502",
  addressPrimaryAr:"عنوان عربي",addressPrimaryLatin:"Latin address",addressAgadir:"Additional address",
  logoPath:"agency/logo.png",documentBranding:{enabled:true,documents:{}},
  bankName:"Bank",bankAccountHolder:"Holder",bankAccountNumber:"CB-001",bankRib:"RIB-001",bankIban:"IBAN-001",bankSwift:"BCMAMAMC",
};

describe("agency settings persistence mapping",()=>{
  test("important settings survive save/fetch/hydrate round trip",()=>{
    const saved=toAgencyRow(editableAgency),hydrated=fromAgencyRow({id:"agency-1",...saved});
    expect(saved).toMatchObject({name_ar:"وكالة عربية",name_fr:"Latin Agency",agency_city:"Tiznit",ice:"ICE-1",rc:"RC-1",email:"agency@example.test",website:"agency.test",phone_tiznit1:"0501",phone_tiznit2:"0502",address_primary_ar:"عنوان عربي",address_primary_latin:"Latin address",address_agadir:"Additional address",bank_name:"Bank",bank_account_holder:"Holder",bank_account_number:"CB-001",bank_rib:"RIB-001",bank_iban:"IBAN-001",bank_swift:"BCMAMAMC",logo_path:"agency/logo.png"});
    expect(hydrated).toMatchObject(editableAgency);
  });

  test("Arabic and Latin addresses persist independently",()=>{
    expect(fromAgencyRow(toAgencyRow({...editableAgency,addressPrimaryAr:"عربي جديد",addressPrimaryLatin:"Latin kept"}))).toMatchObject({addressPrimaryAr:"عربي جديد",addressPrimaryLatin:"Latin kept"});
    expect(fromAgencyRow(toAgencyRow({...editableAgency,addressPrimaryAr:"عربي محفوظ",addressPrimaryLatin:"New Latin"}))).toMatchObject({addressPrimaryAr:"عربي محفوظ",addressPrimaryLatin:"New Latin"});
  });

  test("legacy French-named values hydrate as canonical Latin values",()=>{
    expect(fromAgencyRow({name_fr:"Legacy agency",address_primary_fr:"Legacy address",address_tiznit:"Older address"})).toMatchObject({agencyNameLatin:"Legacy agency",nameFr:"Legacy agency",addressPrimaryLatin:"Legacy address",addressPrimaryFr:"Legacy address"});
    expect(toAgencyRow({nameFr:"Legacy agency",addressPrimaryFr:"Legacy address"})).toMatchObject({name_fr:"Legacy agency",address_primary_latin:"Legacy address"});
  });

  test("agency payload contains DB columns only and serializable branding",()=>{const payload=toAgencyRow({...editableAgency,previewType:"report",temporaryLogoColor:"#fff",documentBranding:{enabled:true,defaultProfile:{watermark:{enabled:true,size:140,opacity:12}},documents:{invoice:{mode:"inherit"},report:{mode:"off"}}}});expect(payload.previewType).toBeUndefined();expect(payload.temporaryLogoColor).toBeUndefined();expect(payload).toHaveProperty("document_branding");expect(()=>JSON.stringify(payload.document_branding)).not.toThrow();expect(JSON.stringify(payload.document_branding)).not.toContain("undefined");expect(Object.keys(payload).every((key)=>key===key.toLowerCase()&&!/[A-Z]/.test(key))).toBe(true);});

  test("empty and partial bank fields map and hydrate without undefined",()=>{const payload=toAgencyRow({bankName:"Bank",bankAccountNumber:"",bankSwift:null,documentBranding:null});expect(payload).toMatchObject({bank_name:"Bank",bank_account_number:"",bank_swift:null});const hydrated=fromAgencyRow(payload);expect(hydrated).toMatchObject({bankName:"Bank",bankAccountNumber:"",bankSwift:""});});

  test("Supabase error reporting exposes diagnostic fields without payload values",()=>{const report=getSupabaseErrorReport({code:"PGRST204",message:"missing column",details:"schema cache",hint:"reload"},{operation:"update",table:"public.agencies",payloadKeys:["document_branding","bank_swift"]});expect(report).toEqual({operation:"update",table:"public.agencies",code:"PGRST204",message:"missing column",details:"schema cache",hint:"reload",payloadKeys:["document_branding","bank_swift"]});expect(JSON.stringify(report)).not.toContain("secret-value");});
});
