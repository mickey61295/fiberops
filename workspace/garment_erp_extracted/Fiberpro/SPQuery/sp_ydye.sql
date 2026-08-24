/*;=============================================   
; Author           :  Global Software's    
; Create date      :  22/05/2023 
; Create By        :  chandru  
; Description      :  QUERY
; Change Person    :  chandru
; Last Change Date :  21/06/2023 10.36 AM 
; =============================================  */  
     
 CREATE Procedure sp_ydye @Ordid as int as
 
 
  select distinct x.countname,x.colordesc,sum(x.Reqkgs) as req,sum(x.grnkgs) as grn,sum(x.knitkgs) as knitkgs,sum(retkgs) as retkgs,sum(Trnsin) as Trnsin,sum(TrnsOut) as TrnsOut ,sum(stkadj) as stkadj ,sum(stockkgs) as stockkgs from(  
  
  
  select distinct Mas_count.CountName,ColorDesc, sum(Pro_ReqYarn.reqkgs) as Reqkgs,0 as grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs,0 as Trnsin    ,0 as TrnsOut,0 as stkadj,0 as stockkgs  from Ordermas inner join Pro_ReqYarn on Pro_ReqYarn.Ordid = OrderMas.OrdId    left outer join Mas_color on    Pro_reqyarn.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = Pro_ReqYarn.CountId  where ordermas.ordid =@Ordid and Deptid in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),'')))) group by CountName ,ColorDesc,reqkgs 
  
  
  union all   
  
  
  	select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,sum(Trs_grn2.RecKgs) as  grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs ,0 as Trnsin,0 as TrnsOut,0 as stkadj ,0 as stockkgs    from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid  = OrderMas.OrdId  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID   inner join stocktable on stocktable.StockID =trs_grn2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where ordermas.OrdId=@Ordid and stocktable.Dept in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  and  Trs_Grn1.GRNType <> 'Process Return'group by CountName,ColorDesc 
	
	
	union all  select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,0 as retkgs,Trs_del2.kg as knitkgs,0 as Ydyekgs,0 as Trnsin,0 as TrnsOut,0 as stkadj ,0 as stockkgs    from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where ordermas.OrdId=@Ordid and Trs_Del1.Prs_Dept   in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (3)) x for xml path('')),1,1,''),''))))   and stocktable.dept in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  group by CountName,ColorDesc,Trs_Del2.Kg 
	
	
	 union all  	select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,sum(Trs_grn2.RecKgs) as retkgs,0 as knitkgs,0 as Ydyekgs ,0 as Trnsin,0 as TrnsOut,0 as stkadj ,0 as stockkgs    from Ordermas inner join Trs_grn2 on Trs_GRN2.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =trs_grn2.StockID  inner join trs_grn1 on trs_grn2.id = trs_grn1.ID  left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where ordermas.OrdId=@Ordid and StockTable.Dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),'')))) and trs_grn1.GRNType ='Process Return' group by CountName,ColorDesc ,Trs_grn2.RecKgs 
	 
	 
	 
	  union all   select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs,Trs_Del2.kg as Trnsin,0 as TrnsOut,0 as stkadj ,0 as stockkgs  from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_del2.TranOrdID=@Ordid and Trs_Del1.Prs_Dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  and trs_del1.TrType = 3 and stocktable.dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),'')))) group by CountName,ColorDesc,Trs_Del2.Kg 
	  
	  
	   union all   select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs,0 as Trnsin,Trs_del2.kg as TrnsOut,0 as stkadj,0 as stockkgs  from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_del2.OrdId=@Ordid and Trs_Del1.Prs_Dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  and trs_del1.TrType = 3 and stocktable.dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  group by CountName,ColorDesc,Trs_Del2.Kg
	   
	   
	   
	    union all   select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs,0 as Trnsin,0 as TrnsOut,Trs_del2.kg as stkadj,0 as stockkgs from Ordermas inner join Trs_Del2 on Trs_Del2.ordid = OrderMas.OrdId  inner join trs_del1 on trs_del2.id = trs_del1.ID join stocktable on stocktable.StockID =Trs_Del2.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Trs_del2.OrdId=@Ordid and Trs_Del1.Prs_Dept in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  and trs_del1.TrType = 5 and stocktable.dept in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),''))))  group by CountName,ColorDesc,Trs_Del2.Kg   
		
		
		 union all   select distinct CountName as CountName,ColorDesc as ColorDesc,0 as Reqkgs,0 as  grnkgs,0 as retkgs,0 as knitkgs,0 as Ydyekgs,0 as Trnsin,0 as TrnsOut,0 as stkadj,currentstock.Kg as stockkgs from Ordermas inner join Currentstock on Currentstock.ordid = OrderMas.OrdId  inner join stocktable on stocktable.StockID =Currentstock.StockID   left outer join Mas_color on    stocktable.ColId = Mas_Color.ColID left outer join Mas_count on Mas_count.CountID = stocktable.CntID where Currentstock.OrdId=@Ordid and stocktable.Dept  in(select id from fnSplitter ((select isNull(stuff(( select ',' + x.Dept	from (Select Distinct Rtrim(Related_deptid) As Dept  From Fcr_config  where sno in (2)) x for xml path('')),1,1,''),'')))) group by CountName,ColorDesc,Currentstock.Kg)   x group by x.countname,x.colordesc 