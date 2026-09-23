import { createClient } from './client'

export const ORGANIZATION_TYPES = [
  { value:'vendor',label:'Technology vendor' },{ value:'distributor',label:'Distributor' },{ value:'reseller',label:'Reseller' },{ value:'var',label:'VAR / solution provider' },{ value:'msp',label:'Managed service provider (MSP)' },{ value:'mssp',label:'Managed security service provider (MSSP)' },{ value:'system_integrator',label:'System integrator' },{ value:'technology_partner',label:'Technology / integration partner' },{ value:'service_provider',label:'Service provider' },{ value:'customer',label:'Technology customer' },{ value:'other',label:'Other' },
] as const
export const ORGANIZATION_ROLES=ORGANIZATION_TYPES.filter(({value})=>value!=='other')
export type OrganizationType=typeof ORGANIZATION_TYPES[number]['value']

export async function ensureWorkspace(){
 const supabase=createClient();const {data:auth,error:authError}=await supabase.auth.getUser();const user=auth.user;if(authError||!user||user.is_anonymous)throw authError||new Error('Please sign in.')
 const {data:existing,error:memberError}=await supabase.from('org_members').select('org_id, organizations(id,name,slug,plan,brand_color,logo_url,organization_type,organization_roles,onboarding_status,ai_autonomy_level)').eq('user_id',user.id).eq('status','active').limit(1).maybeSingle()
 if(memberError)throw memberError
 if(existing?.org_id)return{supabase,user,organization:Array.isArray(existing.organizations)?existing.organizations[0]:existing.organizations,orgId:existing.org_id}
 const metadata=user.user_metadata||{};const baseName=(metadata.organization_name as string|undefined)?.trim()||(metadata.full_name as string|undefined)?.trim()||user.email?.split('@')[0]||'My Workspace';const slugBase=baseName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,48)||'workspace';const slug=`${slugBase}-${user.id.slice(0,8)}`;const organizationType=typeof metadata.organization_type==='string'?metadata.organization_type:null;const organizationRoles=Array.isArray(metadata.organization_roles)?metadata.organization_roles.filter((v):v is string=>typeof v==='string'):[]
 const {data:organization,error:orgError}=await supabase.from('organizations').insert({name:baseName,slug,owner_id:user.id,plan:'starter',organization_type:organizationType,organization_roles:organizationRoles,onboarding_status:organizationType?'completed':'needs_setup',ai_autonomy_level:'balanced'}).select('id,name,slug,plan,brand_color,logo_url,organization_type,organization_roles,onboarding_status,ai_autonomy_level').single()
 if(orgError||!organization)throw orgError||new Error('Could not create workspace.')
 const {error:insertMemberError}=await supabase.from('org_members').insert({org_id:organization.id,user_id:user.id,role:'owner',status:'active'});if(insertMemberError)throw insertMemberError
 return{supabase,user,organization,orgId:organization.id}
}