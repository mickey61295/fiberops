/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  18/11/2022 10.00 AM 
; =============================================  */  

CREATE PROCEDURE SP_CpyPrgmDet(@Ordid int,@StyleNo Varchar(50))
AS
Insert into Prog_ClrComb_Duplicate(OrdID,StyleNo,compID,ClrCombID,FabDesc,FabClr,GreyGsm,FinalGsm,GG,LL,FabWid,WtUom,LooseFab,ID,Yd,PExc,CompGrdSlno,Tex,LL_EDIT_Done,FinCol,FinCnt,OrdSheet_ClrCombID,Slno,PartID,Component_Block,OverDyeing) Select OrdID,StyleNo,compID,ClrCombID,FabDesc,FabClr,GreyGsm,FinalGsm,GG,LL,FabWid,WtUom,LooseFab,ID,Yd,PExc,CompGrdSlno,Tex,LL_EDIT_Done,FinCol,FinCnt,OrdSheet_ClrCombID,Slno,PartID,Component_Block,OverDyeing from Prog_ClrComb where OrdID =@Ordid AND StyleNo=@StyleNo


           Insert into Prog_Component_Duplicate(OrdID,StyleNo,CompID,KnitWoven,Gsm,sl,GrdSlNo,M_W_Wo,cm_inch,sing_tup,parts,Component_Block) Select OrdID,StyleNo,CompID,KnitWoven,Gsm,sl,GrdSlNo,M_W_Wo,cm_inch,sing_tup,parts,Component_Block from Prog_Component where OrdID =@Ordid AND StyleNo=@StyleNo And Sl in (SELECT ID FROM Prog_ClrComb WHERE OrdID = @Ordid AND StyleNo = @StyleNo)

           Insert into Prog_Ycns_Duplicate(ID,YCount,Yclr,ConsPer,FabToYarn,SlNo,ProcType) Select ID,YCount,Yclr,ConsPer,FabToYarn,SlNo,ProcType from Prog_Ycns Where id in (SELECT ID FROM Prog_ClrComb WHERE OrdID = @Ordid AND StyleNo = @StyleNo)
           Insert into Prog_cns_Duplicate (ID,sizid,pcswgt,kdia,fdia,ldia,len,wid,lenAlow,widAlow,ACTPCSWGT,NoofPiece,FABWIDTH,Dia_Edit_Done,KnitDiaEditDone) Select ID,sizid,pcswgt,kdia,fdia,ldia,len,wid,lenAlow,widAlow,ACTPCSWGT,NoofPiece,FABWIDTH,Dia_Edit_Done,KnitDiaEditDone from Prog_cns Where id in (SELECT ID FROM Prog_ClrComb WHERE OrdID = @Ordid AND StyleNo = @Styleno)

           Insert into Prog_PrsLoss_Duplicate(ID,Prs,Loss_Per,subPrsID) Select ID,Prs,Loss_Per,SubPrsID from Prog_PrsLoss Where id in (SELECT ID FROM Prog_ClrComb WHERE OrdID = @Ordid AND StyleNo = @Styleno)

           Insert into PartDefine_Duplicate (OrdID,Styleno,PartID,CompId,GrdSlno) Select OrdID,Styleno,PartID,CompId,GrdSlno from PartDefine Where OrdID =@Ordid AND StyleNo=@StyleNo


           Insert into Prog_Design_Duplicate(OrdId,StyleNo,DeptId,ComboId,CompId,DesignId,ID,Block,Repeatedlen) Select OrdId,StyleNo,DeptId,ComboId,CompId,DesignId,ID,Block,IsNull(Repeatedlen,'') as Repeatedlen from Prog_Design Where OrdID =@Ordid AND StyleNo=@StyleNo and DeptID=10 

            
           Insert into Pro_ReqYarn_Duplicate (ORdid,DeptId,SlNo,CountID,ColId,ReqKgs,Rate,Styleno,ShortKgs,FabToYarn_Flag,CancelKgs)  Select ORdid,DeptId,SlNo,CountID,ColId,ReqKgs,Rate,Styleno,ShortKgs,FabToYarn_Flag,CancelKgs from Pro_ReqYarn where OrdID =@Ordid AND StyleNo=@StyleNo
           Insert into Pro_ReqKnitt_Duplicate
		   (OrdId,DeptId,Slno,FabId,ColId,CntID,GSM,GG,LL,DiaID,ReqKgs,ReqMtr,Rate,StyleNo,diaslno,ConsID,DesignId,ShortKgs,ShortMtr,FinDiaId,FinGSM,FabToYarnFlg,Cancelkgs,CancelMtr,Repeatedlen,SubPrsID) Select OrdId,DeptId,Slno,FabId,ColId,CntID,GSM,GG,LL,DiaID,ReqKgs,ReqMtr,Rate,StyleNo,diaslno,ConsID,DesignId,ShortKgs,ShortMtr,FinDiaId,FinGSM,FabToYarnFlg,Cancelkgs,CancelMtr,IsNull(Repeatedlen,'') as Repeatedlen,SubPrsID  from Pro_ReqKnitt where OrdID =@Ordid  AND StyleNo=@StyleNo